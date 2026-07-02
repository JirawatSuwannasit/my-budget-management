"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFinancialCycle, getUserCycleStartDay } from "@/lib/finance/cycle";
import { addDelta, applyAccountBalanceDeltas, getAccountBalanceDeltas, getReverseAccountBalanceDeltas, type AccountBalanceDelta } from "@/lib/finance/transaction-effects";
import type { TransactionType } from "@/lib/finance/types";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";

export type TransactionActionState = { status: "idle" | "success" | "error"; message: string };
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
type TransactionRow = { id: string; account_id: string | null; destination_account_id: string | null; type: TransactionType; amount: number | string; transaction_date: string; cycle_start_date: string; related_entity_id: string | null; notes: string | null };
type TransactionMessages = Record<keyof typeof dictionaries.en.transactions.messages, string>;
const transactionTypes: TransactionType[] = ["income", "expense", "transfer", "credit_card_expense", "credit_card_payment", "debt_payment", "investment_transfer", "sinking_fund_reserve"];

function localeFromForm(formData: FormData): Locale {
  const locale = formData.get("locale");
  return isLocale(locale) ? locale : "th";
}

function getMessages(formData: FormData): TransactionMessages {
  return dictionaries[localeFromForm(formData)].transactions.messages;
}

function parseType(value: FormDataEntryValue | null, messages: TransactionMessages): TransactionType {
  if (typeof value !== "string" || !transactionTypes.includes(value as TransactionType)) throw new Error(messages.invalidType);
  return value as TransactionType;
}
function parseAmount(value: FormDataEntryValue | null, messages: TransactionMessages) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(messages.amountPositive);
  return amount;
}
function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}
function parseLocalDate(value: string, messages: TransactionMessages) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) throw new Error(messages.invalidDate);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}
function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}
async function getUserId(messages: TransactionMessages = dictionaries.th.transactions.messages) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error(messages.loginAgain);
  return { supabase, userId: user.id };
}
// Single source of truth for writing account balance deltas: one batched
// read, in-memory below-zero validation for every affected account, then
// parallel per-account writes. See transaction-effects.ts for details.
async function applyAccountDeltas(supabase: SupabaseServer, userId: string, deltas: AccountBalanceDelta[], messages: TransactionMessages) {
  await applyAccountBalanceDeltas(supabase, userId, deltas, messages.balanceBelowZero);
}
function revalidateFinanceViews() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/debts-cards");
  revalidatePath("/planning");
  revalidatePath("/categories");
}
async function updateDebtRemaining(supabase: SupabaseServer, userId: string, debtId: string, delta: number) {
  const { data, error } = await supabase.from("debts").select("remaining_balance").eq("id", debtId).eq("user_id", userId).single();
  if (error) throw new Error(error.message);
  const remainingBalance = Math.max(0, Number(data.remaining_balance ?? 0) + delta);
  const { error: updateError } = await supabase.from("debts").update({ remaining_balance: remainingBalance }).eq("id", debtId).eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);
}
function buildPayload(formData: FormData, userId: string, messages: TransactionMessages, startDay: number) {
  const type = parseType(formData.get("type"), messages);
  const amount = parseAmount(formData.get("amount"), messages);
  const transactionDate = String(formData.get("transaction_date") ?? "");
  const cycleStart = getFinancialCycle(parseLocalDate(transactionDate, messages), startDay).start;
  const accountId = textValue(formData, "account_id");
  const rawDestinationAccountId = textValue(formData, "destination_account_id");
  const creditCardId = textValue(formData, "credit_card_id");
  const debtId = textValue(formData, "debt_id");
  const reserveEntityId = textValue(formData, "reserve_entity_id");
  const expenseRelatedEntityId = textValue(formData, "expense_related_entity_id");
  const categoryId = textValue(formData, "category_id");
  const notes = textValue(formData, "notes");
  if (["income", "expense", "transfer", "investment_transfer", "credit_card_payment", "debt_payment"].includes(type) && !accountId) throw new Error(messages.chooseCashAccount);
  if (type === "transfer" && !rawDestinationAccountId) throw new Error(messages.chooseTransferDestination);
  if (type === "investment_transfer" && !rawDestinationAccountId) throw new Error(messages.chooseInvestmentDestination);
  if (type === "credit_card_expense" && !creditCardId) throw new Error(messages.chooseCreditCard);
  if (type === "credit_card_payment" && !creditCardId) throw new Error(messages.chooseCreditCard);
  if (type === "debt_payment" && !debtId) throw new Error(messages.chooseDebt);
  if (type === "sinking_fund_reserve" && rawDestinationAccountId) {
    // Annual-expense reserves are real transfers (source cash-like -> bound
    // reserve account). Subscription reserves send no accounts and stay
    // balance-neutral markers, so only enforce transfer rules when a reserve
    // (destination) account is present.
    if (!accountId) throw new Error(messages.chooseReserveSource);
    if (accountId === rawDestinationAccountId) throw new Error(messages.reserveSameAccount);
  }
  // For credit_card_expense, prefer an explicit linked entity (e.g. a subscription
  // paid by card) so cycle "paid/handled" detection works; fall back to the card
  // id for the standalone card-expense flow. Card linkage lives in
  // card_transactions.card_id regardless, and revert keys off transaction_id.
  const relatedEntityId = type === "expense" ? expenseRelatedEntityId : type === "credit_card_expense" ? (expenseRelatedEntityId ?? creditCardId) : type === "credit_card_payment" ? creditCardId : type === "debt_payment" ? debtId : type === "sinking_fund_reserve" ? reserveEntityId : null;
  const destinationAccountId = type === "transfer" || type === "investment_transfer" || type === "sinking_fund_reserve" ? rawDestinationAccountId : null;
  return { transaction: { user_id: userId, account_id: accountId, destination_account_id: destinationAccountId, category_id: categoryId, type, amount, transaction_date: transactionDate, cycle_start_date: toDateInput(cycleStart), related_entity_id: relatedEntityId, notes }, extras: { creditCardId, debtId } };
}
// Phase A: account balance + debt-remaining effects. Needs only `payload`, not
// a transaction id, so callers can run it concurrently with the transaction
// INSERT itself (the id is only needed by phase B below).
async function applyAccountAndDebtEffects(supabase: SupabaseServer, userId: string, payload: ReturnType<typeof buildPayload>, messages: TransactionMessages) {
  const tx = payload.transaction;
  const debtId = payload.extras.debtId;
  if (tx.type === "debt_payment" && !debtId) throw new Error(messages.debtAndAccountRequired);
  const deltas = getAccountBalanceDeltas({ type: tx.type, amount: tx.amount, accountId: tx.account_id, destinationAccountId: tx.destination_account_id });
  const tasks: Array<Promise<void>> = [applyAccountDeltas(supabase, userId, deltas, messages)];
  if (tx.type === "debt_payment" && debtId) tasks.push(updateDebtRemaining(supabase, userId, debtId, -tx.amount));
  await Promise.all(tasks);
}

// Phase B: the child-row insert that references transaction_id, so it must
// run only after the transaction row (insert or update) exists.
async function insertChildRow(supabase: SupabaseServer, userId: string, transactionId: string, payload: ReturnType<typeof buildPayload>, messages: TransactionMessages) {
  const tx = payload.transaction;
  if (tx.type === "credit_card_expense") {
    if (!payload.extras.creditCardId) throw new Error(messages.creditCardRequired);
    const { error } = await supabase.from("card_transactions").insert({ user_id: userId, transaction_id: transactionId, card_id: payload.extras.creditCardId, category_id: tx.category_id, amount: tx.amount, transaction_date: tx.transaction_date, billing_cycle_start: tx.cycle_start_date, notes: tx.notes });
    if (error) throw new Error(error.message);
  }
  if (tx.type === "credit_card_payment") {
    if (!payload.extras.creditCardId || !tx.account_id) throw new Error(messages.cardAndAccountRequired);
    const { error } = await supabase.from("card_payments").insert({ user_id: userId, transaction_id: transactionId, card_id: payload.extras.creditCardId, account_id: tx.account_id, amount: tx.amount, payment_date: tx.transaction_date });
    if (error) throw new Error(error.message);
  }
  if (tx.type === "debt_payment") {
    if (!payload.extras.debtId || !tx.account_id) throw new Error(messages.debtAndAccountRequired);
    const { error } = await supabase.from("debt_payments").insert({ user_id: userId, transaction_id: transactionId, debt_id: payload.extras.debtId, account_id: tx.account_id, amount: tx.amount, paid_date: tx.transaction_date, source: "manual" });
    if (error) throw new Error(error.message);
  }
}

// Used by the edit path, where the transaction id is already known: phase A
// and phase B are independent (different tables), so they run concurrently.
async function applyTransactionSideEffects(supabase: SupabaseServer, userId: string, transactionId: string, payload: ReturnType<typeof buildPayload>, messages: TransactionMessages) {
  await Promise.all([applyAccountAndDebtEffects(supabase, userId, payload, messages), insertChildRow(supabase, userId, transactionId, payload, messages)]);
}
async function deleteChildRows(supabase: SupabaseServer, userId: string, table: "card_transactions" | "card_payments" | "debt_payments", transactionId: string) {
  const { error } = await supabase.from(table).delete().eq("transaction_id", transactionId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
async function revertTransactionSideEffects(supabase: SupabaseServer, userId: string, transaction: TransactionRow, messages: TransactionMessages) {
  const amount = Number(transaction.amount);
  if (transaction.type === "credit_card_expense") {
    const { data, error } = await supabase.from("card_transactions").select("id").eq("transaction_id", transaction.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error(messages.unsafeCardExpense);
    await deleteChildRows(supabase, userId, "card_transactions", transaction.id);
    return;
  }
  if (transaction.type === "credit_card_payment") {
    const { data, error } = await supabase.from("card_payments").select("id,account_id,amount").eq("transaction_id", transaction.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error(messages.unsafeCardPayment);
    const deltas: AccountBalanceDelta[] = [];
    for (const payment of data) addDelta(deltas, payment.account_id, Number(payment.amount));
    // The delete is independent of the balance write (different tables), so
    // both can run in parallel once we know the child rows exist.
    await Promise.all([applyAccountDeltas(supabase, userId, deltas, messages), deleteChildRows(supabase, userId, "card_payments", transaction.id)]);
    return;
  }
  if (transaction.type === "debt_payment") {
    const { data, error } = await supabase.from("debt_payments").select("id,account_id,debt_id,amount").eq("transaction_id", transaction.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error(messages.unsafeDebtPayment);
    const deltas: AccountBalanceDelta[] = [];
    for (const payment of data) addDelta(deltas, payment.account_id, Number(payment.amount));
    await Promise.all([
      applyAccountDeltas(supabase, userId, deltas, messages),
      ...data.map((payment) => updateDebtRemaining(supabase, userId, payment.debt_id, Number(payment.amount))),
      deleteChildRows(supabase, userId, "debt_payments", transaction.id)
    ]);
    return;
  }
  await applyAccountDeltas(supabase, userId, getReverseAccountBalanceDeltas({ type: transaction.type, amount, accountId: transaction.account_id, destinationAccountId: transaction.destination_account_id }), messages);
}
export async function saveTransaction(_previousState: TransactionActionState, formData: FormData): Promise<TransactionActionState> {
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserId(messages);
    const id = String(formData.get("id") ?? "").trim();

    if (id) {
      // Both reads only need userId, so run them concurrently.
      const [startDay, existingResult] = await Promise.all([getUserCycleStartDay(supabase, userId), supabase.from("transactions").select("*").eq("id", id).eq("user_id", userId).single()]);
      const { data: existing, error: existingError } = existingResult;
      if (existingError) throw new Error(existingError.message);
      const payload = buildPayload(formData, userId, messages, startDay);
      // Revert phase fully completes before the apply phase begins.
      await revertTransactionSideEffects(supabase, userId, existing as TransactionRow, messages);
      const { error } = await supabase.from("transactions").update(payload.transaction).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      await applyTransactionSideEffects(supabase, userId, id, payload, messages);
      revalidateFinanceViews();
      return { status: "success", message: messages.updated };
    }

    const startDay = await getUserCycleStartDay(supabase, userId);
    const payload = buildPayload(formData, userId, messages, startDay);
    // Account/debt effects don't depend on the transaction id, so they run
    // concurrently with the INSERT; the child-row insert (phase B) needs the
    // new id and so must wait for it.
    const [insertResult] = await Promise.all([supabase.from("transactions").insert(payload.transaction).select("id").single(), applyAccountAndDebtEffects(supabase, userId, payload, messages)]);
    const { data: inserted, error } = insertResult;
    if (error) throw new Error(error.message);
    await insertChildRow(supabase, userId, inserted.id, payload, messages);
    revalidateFinanceViews();
    return { status: "success", message: messages.added };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : messages.saveFailed };
  }
}
export async function deleteTransaction(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserId(messages);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error(messages.idRequired);
  const { data: existing, error: existingError } = await supabase.from("transactions").select("*").eq("id", id).eq("user_id", userId).single();
  if (existingError) throw new Error(existingError.message);
  await revertTransactionSideEffects(supabase, userId, existing as TransactionRow, messages);
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateFinanceViews();
}

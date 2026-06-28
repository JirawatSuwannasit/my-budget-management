"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFinancialCycle } from "@/lib/finance/cycle";
import { getAccountBalanceDeltas, getReverseAccountBalanceDeltas } from "@/lib/finance/transaction-effects";
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
async function adjustAccountBalance(supabase: SupabaseServer, userId: string, accountId: string, delta: number, messages: TransactionMessages) {
  const { data, error } = await supabase.from("accounts").select("balance").eq("id", accountId).eq("user_id", userId).single();
  if (error) throw new Error(error.message);
  const nextBalance = Number(data.balance ?? 0) + delta;
  if (nextBalance < 0) throw new Error(messages.balanceBelowZero);
  const { error: updateError } = await supabase.from("accounts").update({ balance: nextBalance }).eq("id", accountId).eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);
}
async function applyAccountDeltas(supabase: SupabaseServer, userId: string, deltas: Array<{ accountId: string; delta: number }>, messages: TransactionMessages) {
  for (const delta of deltas) await adjustAccountBalance(supabase, userId, delta.accountId, delta.delta, messages);
}
function revalidateFinanceViews() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/debts-cards");
  revalidatePath("/planning");
  revalidatePath("/categories");
}
async function updateStatementPaidAmount(supabase: SupabaseServer, userId: string, statementId: string, delta: number) {
  const { data, error } = await supabase.from("credit_card_statements").select("statement_amount_due,paid_amount").eq("id", statementId).eq("user_id", userId).single();
  if (error) throw new Error(error.message);
  const statementAmountDue = Number(data.statement_amount_due ?? 0);
  const paidAmount = Math.max(0, Number(data.paid_amount ?? 0) + delta);
  const status = paidAmount <= 0 ? "unpaid" : paidAmount >= statementAmountDue ? "paid" : "partial";
  const { error: updateError } = await supabase.from("credit_card_statements").update({ paid_amount: paidAmount, status }).eq("id", statementId).eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);
}
async function updateDebtRemaining(supabase: SupabaseServer, userId: string, debtId: string, delta: number) {
  const { data, error } = await supabase.from("debts").select("remaining_balance").eq("id", debtId).eq("user_id", userId).single();
  if (error) throw new Error(error.message);
  const remainingBalance = Math.max(0, Number(data.remaining_balance ?? 0) + delta);
  const { error: updateError } = await supabase.from("debts").update({ remaining_balance: remainingBalance }).eq("id", debtId).eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);
}
function buildPayload(formData: FormData, userId: string, messages: TransactionMessages) {
  const type = parseType(formData.get("type"), messages);
  const amount = parseAmount(formData.get("amount"), messages);
  const transactionDate = String(formData.get("transaction_date") ?? "");
  const cycleStart = getFinancialCycle(parseLocalDate(transactionDate, messages)).start;
  const accountId = textValue(formData, "account_id");
  const rawDestinationAccountId = textValue(formData, "destination_account_id");
  const creditCardId = textValue(formData, "credit_card_id");
  const statementId = textValue(formData, "statement_id");
  const debtId = textValue(formData, "debt_id");
  const reserveEntityId = textValue(formData, "reserve_entity_id");
  const expenseRelatedEntityId = textValue(formData, "expense_related_entity_id");
  const categoryId = textValue(formData, "category_id");
  const notes = textValue(formData, "notes");
  if (["income", "expense", "transfer", "investment_transfer", "credit_card_payment", "debt_payment"].includes(type) && !accountId) throw new Error(messages.chooseCashAccount);
  if (type === "transfer" && !rawDestinationAccountId) throw new Error(messages.chooseTransferDestination);
  if (type === "investment_transfer" && !rawDestinationAccountId) throw new Error(messages.chooseInvestmentDestination);
  if (type === "credit_card_expense" && !creditCardId) throw new Error(messages.chooseCreditCard);
  if (type === "credit_card_payment" && !statementId) throw new Error(messages.chooseStatement);
  if (type === "debt_payment" && !debtId) throw new Error(messages.chooseDebt);
  const relatedEntityId = type === "expense" ? expenseRelatedEntityId : type === "credit_card_expense" ? creditCardId : type === "credit_card_payment" ? statementId : type === "debt_payment" ? debtId : type === "sinking_fund_reserve" ? reserveEntityId : null;
  const destinationAccountId = type === "transfer" || type === "investment_transfer" ? rawDestinationAccountId : null;
  return { transaction: { user_id: userId, account_id: accountId, destination_account_id: destinationAccountId, category_id: categoryId, type, amount, transaction_date: transactionDate, cycle_start_date: toDateInput(cycleStart), related_entity_id: relatedEntityId, notes }, extras: { creditCardId, statementId, debtId } };
}
async function applyTransactionSideEffects(supabase: SupabaseServer, userId: string, transactionId: string, payload: ReturnType<typeof buildPayload>, messages: TransactionMessages) {
  const tx = payload.transaction;
  await applyAccountDeltas(supabase, userId, getAccountBalanceDeltas({ type: tx.type, amount: tx.amount, accountId: tx.account_id, destinationAccountId: tx.destination_account_id }), messages);
  if (tx.type === "credit_card_expense") {
    if (!payload.extras.creditCardId) throw new Error(messages.creditCardRequired);
    const { error } = await supabase.from("card_transactions").insert({ user_id: userId, transaction_id: transactionId, card_id: payload.extras.creditCardId, category_id: tx.category_id, amount: tx.amount, transaction_date: tx.transaction_date, billing_cycle_start: tx.cycle_start_date, notes: tx.notes });
    if (error) throw new Error(error.message);
  }
  if (tx.type === "credit_card_payment") {
    if (!payload.extras.statementId || !tx.account_id) throw new Error(messages.statementAndAccountRequired);
    const { data: statement, error: statementError } = await supabase.from("credit_card_statements").select("card_id").eq("id", payload.extras.statementId).eq("user_id", userId).single();
    if (statementError) throw new Error(statementError.message);
    const { error } = await supabase.from("card_payments").insert({ user_id: userId, transaction_id: transactionId, card_id: statement.card_id, statement_id: payload.extras.statementId, account_id: tx.account_id, amount: tx.amount, payment_date: tx.transaction_date });
    if (error) throw new Error(error.message);
    await updateStatementPaidAmount(supabase, userId, payload.extras.statementId, tx.amount);
  }
  if (tx.type === "debt_payment") {
    if (!payload.extras.debtId || !tx.account_id) throw new Error(messages.debtAndAccountRequired);
    const { error } = await supabase.from("debt_payments").insert({ user_id: userId, transaction_id: transactionId, debt_id: payload.extras.debtId, account_id: tx.account_id, amount: tx.amount, paid_date: tx.transaction_date, source: "manual" });
    if (error) throw new Error(error.message);
    await updateDebtRemaining(supabase, userId, payload.extras.debtId, -tx.amount);
  }
}
async function revertTransactionSideEffects(supabase: SupabaseServer, userId: string, transaction: TransactionRow, messages: TransactionMessages) {
  const amount = Number(transaction.amount);
  if (transaction.type === "credit_card_expense") {
    const { data, error } = await supabase.from("card_transactions").select("id").eq("transaction_id", transaction.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error(messages.unsafeCardExpense);
    const { error: deleteError } = await supabase.from("card_transactions").delete().eq("transaction_id", transaction.id).eq("user_id", userId);
    if (deleteError) throw new Error(deleteError.message);
    return;
  }
  if (transaction.type === "credit_card_payment") {
    const { data, error } = await supabase.from("card_payments").select("id,account_id,statement_id,amount").eq("transaction_id", transaction.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error(messages.unsafeCardPayment);
    for (const payment of data) {
      if (payment.account_id) await adjustAccountBalance(supabase, userId, payment.account_id, Number(payment.amount), messages);
      if (payment.statement_id) await updateStatementPaidAmount(supabase, userId, payment.statement_id, -Number(payment.amount));
    }
    const { error: deleteError } = await supabase.from("card_payments").delete().eq("transaction_id", transaction.id).eq("user_id", userId);
    if (deleteError) throw new Error(deleteError.message);
    return;
  }
  if (transaction.type === "debt_payment") {
    const { data, error } = await supabase.from("debt_payments").select("id,account_id,debt_id,amount").eq("transaction_id", transaction.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error(messages.unsafeDebtPayment);
    for (const payment of data) {
      if (payment.account_id) await adjustAccountBalance(supabase, userId, payment.account_id, Number(payment.amount), messages);
      await updateDebtRemaining(supabase, userId, payment.debt_id, Number(payment.amount));
    }
    const { error: deleteError } = await supabase.from("debt_payments").delete().eq("transaction_id", transaction.id).eq("user_id", userId);
    if (deleteError) throw new Error(deleteError.message);
    return;
  }
  await applyAccountDeltas(supabase, userId, getReverseAccountBalanceDeltas({ type: transaction.type, amount, accountId: transaction.account_id, destinationAccountId: transaction.destination_account_id }), messages);
}
export async function saveTransaction(_previousState: TransactionActionState, formData: FormData): Promise<TransactionActionState> {
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserId(messages);
    const id = String(formData.get("id") ?? "").trim();
    const payload = buildPayload(formData, userId, messages);
    if (id) {
      const { data: existing, error: existingError } = await supabase.from("transactions").select("*").eq("id", id).eq("user_id", userId).single();
      if (existingError) throw new Error(existingError.message);
      await revertTransactionSideEffects(supabase, userId, existing as TransactionRow, messages);
      const { error } = await supabase.from("transactions").update(payload.transaction).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      await applyTransactionSideEffects(supabase, userId, id, payload, messages);
      revalidateFinanceViews();
      return { status: "success", message: messages.updated };
    }
    const { data: inserted, error } = await supabase.from("transactions").insert(payload.transaction).select("id").single();
    if (error) throw new Error(error.message);
    await applyTransactionSideEffects(supabase, userId, inserted.id, payload, messages);
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

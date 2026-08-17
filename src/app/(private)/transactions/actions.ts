"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFinancialCycle, getUserCycleStartDay } from "@/lib/finance/cycle";
import { findTransactionsForCard, findTransactionsForRelatedEntity, revertAndDeleteTransactions } from "@/lib/finance/cascade-delete";
import type { TransactionType } from "@/lib/finance/types";
import { isQuickTransactionType, resolveQuickAmount } from "@/lib/finance/quick-templates";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";

export type TransactionActionState = { status: "idle" | "success" | "error"; message: string; transactionId?: string };
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
function revalidateFinanceViews() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/debts-cards");
  revalidatePath("/planning");
  revalidatePath("/categories");
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
type FinanceRpcResult = { transaction_id: string; status: "created" | "updated" };

function rpcErrorMessage(error: { message?: string } | null, messages: TransactionMessages, fallback: string) {
  const code = error?.message ?? "";
  const mappings: Array<[string, string]> = [
    ["FINANCE_LOGIN_REQUIRED", messages.loginAgain],
    ["FINANCE_AMOUNT_POSITIVE", messages.amountPositive],
    ["FINANCE_SOURCE_REQUIRED", messages.chooseCashAccount],
    ["FINANCE_DESTINATION_REQUIRED", messages.chooseTransferDestination],
    ["FINANCE_SAME_ACCOUNT", messages.reserveSameAccount],
    ["FINANCE_INSUFFICIENT_BALANCE", messages.balanceBelowZero],
    ["FINANCE_CARD_REQUIRED", messages.creditCardRequired],
    ["FINANCE_DEBT_REQUIRED", messages.debtAndAccountRequired],
    ["FINANCE_TRANSACTION_NOT_FOUND", messages.saveFailed],
    ["FINANCE_INVALID_REFERENCE", messages.saveFailed],
    ["FINANCE_UNSAFE_CARD_EXPENSE", messages.unsafeCardExpense],
    ["FINANCE_UNSAFE_CARD_PAYMENT", messages.unsafeCardPayment],
    ["FINANCE_UNSAFE_DEBT_PAYMENT", messages.unsafeDebtPayment]
  ];
  return mappings.find(([marker]) => code.includes(marker))?.[1] ?? fallback;
}

export async function saveTransaction(_previousState: TransactionActionState, formData: FormData): Promise<TransactionActionState> {
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserId(messages);
    const startDay = await getUserCycleStartDay(supabase, userId);
    const payload = buildPayload(formData, userId, messages, startDay);
    const id = String(formData.get("id") ?? "").trim();
    const args = {
      p_type: payload.transaction.type,
      p_amount: payload.transaction.amount,
      p_account_id: payload.transaction.account_id,
      p_destination_account_id: payload.transaction.destination_account_id,
      p_category_id: payload.transaction.category_id,
      p_transaction_date: payload.transaction.transaction_date,
      p_cycle_start_date: payload.transaction.cycle_start_date,
      p_related_entity_id: payload.transaction.related_entity_id,
      p_notes: payload.transaction.notes,
      p_credit_card_id: payload.extras.creditCardId,
      p_debt_id: payload.extras.debtId
    };
    const rpcName = id ? "update_finance_transaction" : "create_finance_transaction";
    const { data, error } = await supabase.rpc(rpcName, id ? { p_transaction_id: id, ...args } : args);
    if (error) return { status: "error", message: rpcErrorMessage(error, messages, messages.saveFailed) };
    const result = data as FinanceRpcResult;
    revalidateFinanceViews();
    return { status: "success", message: id ? messages.updated : messages.added, transactionId: result.transaction_id };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : messages.saveFailed };
  }
}

/**
 * Cascade-deletes every transaction linked to a planning entity (subscription /
 * annual expense) via `related_entity_id`, across all cycles, and returns how
 * many were removed. Orchestration lives in `cascade-delete.ts`; this wrapper
 * only resolves the session and revalidates.
 */
export async function deleteTransactionsForRelatedEntity(relatedEntityId: string, messages: TransactionMessages = dictionaries.th.transactions.messages): Promise<number> {
  const id = relatedEntityId.trim();
  if (!id) throw new Error(messages.idRequired);
  const { supabase, userId } = await getUserId(messages);

  const transactions = await findTransactionsForRelatedEntity(supabase, userId, id);
  const removed = await revertAndDeleteTransactions(supabase, userId, transactions, messages);
  if (removed > 0) revalidateFinanceViews();
  return removed;
}

/**
 * Cascade-deletes every transaction booked on a credit card and returns how many
 * were removed. Orchestration lives in `cascade-delete.ts`; this wrapper only
 * resolves the session and revalidates.
 */
export async function deleteTransactionsForCard(cardId: string, messages: TransactionMessages = dictionaries.th.transactions.messages): Promise<number> {
  const id = cardId.trim();
  if (!id) throw new Error(messages.idRequired);
  const { supabase, userId } = await getUserId(messages);

  const transactions = await findTransactionsForCard(supabase, userId, id);
  const removed = await revertAndDeleteTransactions(supabase, userId, transactions, messages);
  if (removed > 0) revalidateFinanceViews();
  return removed;
}

export async function deleteTransaction(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase } = await getUserId(messages);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error(messages.idRequired);
  const { error } = await supabase.rpc("delete_finance_transaction", { p_transaction_id: id });
  if (error) throw new Error(rpcErrorMessage(error, messages, messages.saveFailed));
  revalidateFinanceViews();
}

export async function executeQuickTemplate(_previousState: TransactionActionState, formData: FormData): Promise<TransactionActionState> {
  const messages = getMessages(formData);
  const locale = localeFromForm(formData);
  const quick = dictionaries[locale].transactions.quickAdd;
  try {
    const { supabase, userId } = await getUserId(messages);
    const templateId = textValue(formData, "template_id");
    if (!templateId) throw new Error(quick.notFound);
    const { data: template } = await supabase.from("quick_transaction_templates").select("id,user_id,name,type,amount,account_id,category_id,related_entity_id,notes,active").eq("id", templateId).eq("user_id", userId).maybeSingle();
    if (!template) throw new Error(quick.notFound);
    if (!isQuickTransactionType(template.type)) throw new Error(quick.unsupported);
    let amount: number;
    try { amount = resolveQuickAmount(template, textValue(formData, "amount")); } catch (error) {
      throw new Error(error instanceof Error && error.message === "QUICK_TEMPLATE_INACTIVE" ? quick.inactive : messages.amountPositive);
    }
    let accountId = template.account_id as string | null;
    if (accountId) {
        const { data } = await supabase.from("accounts").select("id").eq("id", accountId).eq("user_id", userId).eq("active", true).maybeSingle();
        if (!data) throw new Error(quick.invalidReference);
    } else {
        const { data: settings } = await supabase.from("app_settings").select("default_account_id").eq("user_id", userId).maybeSingle();
        const fallback = settings?.default_account_id as string | null;
        const { data } = fallback ? await supabase.from("accounts").select("id").eq("id", fallback).eq("user_id", userId).eq("active", true).maybeSingle() : { data: null };
        accountId = data?.id ?? null;
    }
    if (!accountId) throw new Error(messages.chooseCashAccount);
    if (template.category_id) {
      const { data } = await supabase.from("categories").select("id").eq("id", template.category_id).eq("user_id", userId).eq("active", true).maybeSingle();
      if (!data) throw new Error(quick.invalidReference);
    }
    const payload = new FormData();
    payload.set("locale", locale); payload.set("type", template.type); payload.set("amount", String(amount));
    payload.set("transaction_date", String(formData.get("transaction_date") ?? ""));
    if (accountId) payload.set("account_id", accountId);
    if (template.category_id) payload.set("category_id", template.category_id);
    if (template.notes) payload.set("notes", template.notes);
    const result = await saveTransaction({ status: "idle", message: "" }, payload);
    return result.status === "success" ? { ...result, message: `${template.name} · ฿${Number(amount).toLocaleString()} ${quick.added}` } : result;
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : quick.invalidReference }; }
}

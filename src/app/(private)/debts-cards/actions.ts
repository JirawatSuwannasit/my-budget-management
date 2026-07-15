"use server";

import { revalidatePath } from "next/cache";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

export type DebtCardActionState = { status: "idle" | "success" | "error"; message: string };
type DebtType = "personal_loan" | "interest_free" | "installment" | "credit_card_debt" | "other";
type DebtCardMessages = Record<keyof typeof dictionaries.en.debtsCards.messages, string>;

const debtTypes: DebtType[] = ["personal_loan", "interest_free", "installment", "credit_card_debt", "other"];

function localeFromForm(formData: FormData): Locale {
  const locale = formData.get("locale");
  return isLocale(locale) ? locale : "th";
}

function getMessages(formData: FormData): DebtCardMessages {
  return dictionaries[localeFromForm(formData)].debtsCards.messages;
}

async function getUserContext(messages: DebtCardMessages = dictionaries.th.debtsCards.messages) {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error(messages.loginAgain);
  return { supabase, userId: user.id };
}

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseAmount(value: FormDataEntryValue | null, messages: DebtCardMessages) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(messages.amountNonNegative);
  return amount;
}

function parseDay(value: FormDataEntryValue | null, messages: DebtCardMessages) {
  const day = Number(value ?? 1);
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error(messages.dayRange);
  return day;
}

function parseDebtType(value: FormDataEntryValue | null, messages: DebtCardMessages): DebtType {
  if (typeof value !== "string" || !debtTypes.includes(value as DebtType)) throw new Error(messages.invalidDebtType);
  return value as DebtType;
}

function revalidateDebtCardViews() {
  revalidatePath("/debts-cards");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function saveDebt(_previousState: DebtCardActionState, formData: FormData): Promise<DebtCardActionState> {
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserContext(messages);
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const type = parseDebtType(formData.get("type"), messages);
    const originalAmount = parseAmount(formData.get("original_amount"), messages);
    const remainingBalance = parseAmount(formData.get("remaining_balance"), messages);
    const interestRate = parseAmount(formData.get("interest_rate"), messages);
    const monthlyPayment = parseAmount(formData.get("monthly_payment"), messages);
    const bonusPaymentAmount = parseAmount(formData.get("bonus_payment_amount"), messages);
    const targetPayoffDate = textValue(formData, "target_payoff_date");
    const active = formData.get("active") === "on";

    if (!name) throw new Error(messages.debtNameRequired);

    const payload = {
      user_id: userId,
      name,
      type,
      original_amount: originalAmount,
      remaining_balance: remainingBalance,
      interest_rate: interestRate,
      monthly_payment: monthlyPayment,
      bonus_payment_amount: bonusPaymentAmount,
      target_payoff_date: targetPayoffDate,
      active
    };

    if (id) {
      const { error } = await supabase.from("debts").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidateDebtCardViews();
      return { status: "success", message: messages.debtUpdated };
    }

    const { error } = await supabase.from("debts").insert(payload);
    if (error) throw new Error(error.message);
    revalidateDebtCardViews();
    return { status: "success", message: messages.debtAdded };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : messages.saveDebtFailed };
  }
}

export async function saveCardInstallment(_previousState: DebtCardActionState, formData: FormData): Promise<DebtCardActionState> {
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserContext(messages);
    const cardId = textValue(formData, "card_id");
    const name = textValue(formData, "name");
    const total = parseAmount(formData.get("total"), messages);
    const months = Number(formData.get("months") ?? 0);
    const interestRate = parseAmount(formData.get("interest_rate"), messages);
    const categoryId = textValue(formData, "category_id");

    if (!cardId) throw new Error(messages.chooseCard);
    if (!name) throw new Error(messages.installmentNameRequired);
    if (!(total > 0)) throw new Error(messages.installmentTotalPositive);
    if (!Number.isInteger(months) || months < 1) throw new Error(messages.installmentMonthsRange);

    // Flat-rate add-on interest; for 0% this equals the total. Keep it simple —
    // no amortization. The installment lives entirely on the debt rail.
    const totalRepayable = Math.round(total * (1 + interestRate / 100) * 100) / 100;
    const monthlyPayment = Math.round((totalRepayable / months) * 100) / 100;

    const payload = {
      user_id: userId,
      type: "installment" as DebtType,
      name,
      card_id: cardId,
      category_id: categoryId,
      original_amount: totalRepayable,
      remaining_balance: totalRepayable,
      interest_rate: interestRate,
      monthly_payment: monthlyPayment,
      installment_months: months,
      bonus_payment_amount: 0,
      target_payoff_date: null,
      active: true
    };

    // Installments do NOT create a card_transaction or statement (would double-count).
    const { error } = await supabase.from("debts").insert(payload);
    if (error) throw new Error(error.message);
    revalidateDebtCardViews();
    return { status: "success", message: messages.installmentAdded };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : messages.saveInstallmentFailed };
  }
}

export async function setDebtActive(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error(messages.debtIdRequired);
  const { error } = await supabase.from("debts").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDebtCardViews();
}

export async function deleteDebt(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  if (!id) throw new Error(messages.debtIdRequired);

  // debt_payments cascades on delete, which would silently erase payment history
  // without reversing the cash-account effects already applied at payment time.
  // Block the delete instead of reversing balances after the fact.
  const { count } = await supabase.from("debt_payments").select("id", { count: "exact", head: true }).eq("debt_id", id).eq("user_id", userId);
  if ((count ?? 0) > 0) throw new Error(messages.installmentHasPayments);

  const { error } = await supabase.from("debts").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDebtCardViews();
}

export async function saveCreditCard(_previousState: DebtCardActionState, formData: FormData): Promise<DebtCardActionState> {
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserContext(messages);
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const billingCutDay = parseDay(formData.get("billing_cut_day"), messages);
    const paymentDueDay = parseDay(formData.get("payment_due_day"), messages);
    const active = formData.get("active") === "on";

    if (!name) throw new Error(messages.cardNameRequired);

    const payload = { user_id: userId, name, billing_cut_day: billingCutDay, payment_due_day: paymentDueDay, active };
    if (id) {
      const { error } = await supabase.from("credit_cards").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidateDebtCardViews();
      return { status: "success", message: messages.cardUpdated };
    }

    const { error } = await supabase.from("credit_cards").insert(payload);
    if (error) throw new Error(error.message);
    revalidateDebtCardViews();
    return { status: "success", message: messages.cardAdded };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : messages.saveCardFailed };
  }
}

export async function setCreditCardActive(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error(messages.cardIdRequired);
  const { error } = await supabase.from("credit_cards").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDebtCardViews();
}

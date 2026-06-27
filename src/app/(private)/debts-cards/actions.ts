"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DebtCardActionState = { status: "idle" | "success" | "error"; message: string };
type DebtType = "personal_loan" | "interest_free" | "installment" | "credit_card_debt" | "other";
type StatementStatus = "unpaid" | "partial" | "paid";

const debtTypes: DebtType[] = ["personal_loan", "interest_free", "installment", "credit_card_debt", "other"];

async function getUserContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please log in again.");
  return { supabase, userId: user.id };
}

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseAmount(value: FormDataEntryValue | null, label: string) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(label + " must be zero or more.");
  return amount;
}

function parseDay(value: FormDataEntryValue | null, label: string) {
  const day = Number(value ?? 1);
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error(label + " must be between 1 and 31.");
  return day;
}

function parseDebtType(value: FormDataEntryValue | null): DebtType {
  if (typeof value !== "string" || !debtTypes.includes(value as DebtType)) throw new Error("Choose a valid debt type.");
  return value as DebtType;
}

function statementStatus(statementAmountDue: number, paidAmount: number): StatementStatus {
  if (paidAmount <= 0) return "unpaid";
  return paidAmount >= statementAmountDue ? "paid" : "partial";
}

function revalidateDebtCardViews() {
  revalidatePath("/debts-cards");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function saveDebt(_previousState: DebtCardActionState, formData: FormData): Promise<DebtCardActionState> {
  try {
    const { supabase, userId } = await getUserContext();
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const type = parseDebtType(formData.get("type"));
    const originalAmount = parseAmount(formData.get("original_amount"), "Original amount");
    const remainingBalance = parseAmount(formData.get("remaining_balance"), "Remaining balance");
    const interestRate = parseAmount(formData.get("interest_rate"), "Interest rate");
    const monthlyPayment = parseAmount(formData.get("monthly_payment"), "Monthly payment");
    const bonusPaymentAmount = parseAmount(formData.get("bonus_payment_amount"), "Bonus payment amount");
    const targetPayoffDate = textValue(formData, "target_payoff_date");
    const active = formData.get("active") === "on";

    if (!name) throw new Error("Debt name is required.");

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
      return { status: "success", message: "Debt updated." };
    }

    const { error } = await supabase.from("debts").insert(payload);
    if (error) throw new Error(error.message);
    revalidateDebtCardViews();
    return { status: "success", message: "Debt added." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not save debt." };
  }
}

export async function setDebtActive(formData: FormData) {
  const { supabase, userId } = await getUserContext();
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Debt id is required.");
  const { error } = await supabase.from("debts").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDebtCardViews();
}

export async function saveCreditCard(_previousState: DebtCardActionState, formData: FormData): Promise<DebtCardActionState> {
  try {
    const { supabase, userId } = await getUserContext();
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const billingCutDay = parseDay(formData.get("billing_cut_day"), "Billing cut day");
    const paymentDueDay = parseDay(formData.get("payment_due_day"), "Payment due day");
    const active = formData.get("active") === "on";

    if (!name) throw new Error("Card name is required.");

    const payload = { user_id: userId, name, billing_cut_day: billingCutDay, payment_due_day: paymentDueDay, active };
    if (id) {
      const { error } = await supabase.from("credit_cards").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidateDebtCardViews();
      return { status: "success", message: "Credit card updated." };
    }

    const { error } = await supabase.from("credit_cards").insert(payload);
    if (error) throw new Error(error.message);
    revalidateDebtCardViews();
    return { status: "success", message: "Credit card added." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not save credit card." };
  }
}

export async function setCreditCardActive(formData: FormData) {
  const { supabase, userId } = await getUserContext();
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Credit card id is required.");
  const { error } = await supabase.from("credit_cards").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDebtCardViews();
}

export async function saveCreditCardStatement(_previousState: DebtCardActionState, formData: FormData): Promise<DebtCardActionState> {
  try {
    const { supabase, userId } = await getUserContext();
    const id = textValue(formData, "id");
    const cardId = textValue(formData, "card_id");
    const cycleStart = textValue(formData, "cycle_start");
    const cycleEnd = textValue(formData, "cycle_end");
    const dueDate = textValue(formData, "due_date");
    const statementAmountDue = parseAmount(formData.get("statement_amount_due"), "Statement amount due");
    const paidAmount = parseAmount(formData.get("paid_amount"), "Paid amount");

    if (!cardId) throw new Error("Choose a credit card.");
    if (!cycleStart || !cycleEnd || !dueDate) throw new Error("Statement cycle and due date are required.");

    const payload = {
      user_id: userId,
      card_id: cardId,
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
      due_date: dueDate,
      statement_amount_due: statementAmountDue,
      paid_amount: paidAmount,
      status: statementStatus(statementAmountDue, paidAmount)
    };

    if (id) {
      const { error } = await supabase.from("credit_card_statements").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidateDebtCardViews();
      return { status: "success", message: "Statement updated." };
    }

    const { error } = await supabase.from("credit_card_statements").insert(payload);
    if (error) throw new Error(error.message);
    revalidateDebtCardViews();
    return { status: "success", message: "Statement added." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not save statement." };
  }
}

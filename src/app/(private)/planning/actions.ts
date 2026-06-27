"use server";

import { revalidatePath } from "next/cache";
import { getFinancialCycle } from "@/lib/finance/cycle";
import type { CategoryKind } from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export type PlanningActionState = { status: "idle" | "success" | "error"; message: string };
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
type SubscriptionFrequency = "monthly" | "yearly";

const subscriptionFrequencies: SubscriptionFrequency[] = ["monthly", "yearly"];

async function getUserContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please log in again.");
  return { supabase, userId: user.id };
}

function parseAmount(value: FormDataEntryValue | null, label: string) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(label + " must be zero or more.");
  return amount;
}

function parseBillingDay(value: FormDataEntryValue | null) {
  const day = Number(value ?? 1);
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error("Billing day must be between 1 and 31.");
  return day;
}

function parseFrequency(value: FormDataEntryValue | null): SubscriptionFrequency {
  if (typeof value !== "string" || !subscriptionFrequencies.includes(value as SubscriptionFrequency)) {
    throw new Error("Choose monthly or yearly billing.");
  }
  return value as SubscriptionFrequency;
}

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function todayAtNoon() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

async function getOrCreateCategory(supabase: SupabaseServer, userId: string, name: string | null, kind: CategoryKind) {
  if (!name) return null;
  const cleanName = name.trim();
  if (!cleanName) return null;

  const { data: existing, error: findError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("name", cleanName)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing?.id) return existing.id as string;

  const { data: inserted, error: insertError } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: cleanName, kind, active: true })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);
  return inserted.id as string;
}

function revalidatePlanningViews() {
  revalidatePath("/planning");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function saveBudget(_previousState: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  try {
    const { supabase, userId } = await getUserContext();
    const id = textValue(formData, "id");
    const label = textValue(formData, "label");
    const amount = parseAmount(formData.get("amount"), "Budget amount");
    const categoryName = textValue(formData, "category_name") ?? label;
    const categoryId = await getOrCreateCategory(supabase, userId, categoryName, "expense");
    const active = formData.get("active") === "on";
    const cycleStartDate = textValue(formData, "cycle_start_date") ?? toDateInput(getFinancialCycle(todayAtNoon()).start);

    if (!label) throw new Error("Budget name is required.");

    const payload = { user_id: userId, label, amount, category_id: categoryId, cycle_start_date: cycleStartDate, active };
    if (id) {
      const { error } = await supabase.from("budgets").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidatePlanningViews();
      return { status: "success", message: "Budget updated." };
    }

    const { error } = await supabase.from("budgets").insert(payload);
    if (error) throw new Error(error.message);
    revalidatePlanningViews();
    return { status: "success", message: "Budget added." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not save budget." };
  }
}

export async function setBudgetActive(formData: FormData) {
  const { supabase, userId } = await getUserContext();
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Budget id is required.");
  const { error } = await supabase.from("budgets").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePlanningViews();
}

export async function saveSubscription(_previousState: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  try {
    const { supabase, userId } = await getUserContext();
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const categoryName = textValue(formData, "category_name");
    const categoryId = await getOrCreateCategory(supabase, userId, categoryName, "subscription");
    const frequency = parseFrequency(formData.get("frequency"));
    const price = parseAmount(formData.get("price"), "Subscription price");
    const billingDay = parseBillingDay(formData.get("billing_day"));
    const paymentMethod = textValue(formData, "payment_method");
    const active = formData.get("active") === "on";

    if (!name) throw new Error("Subscription name is required.");

    const payload = { user_id: userId, name, category_id: categoryId, frequency, price, billing_day: billingDay, payment_method: paymentMethod, active };
    if (id) {
      const { error } = await supabase.from("subscriptions").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidatePlanningViews();
      return { status: "success", message: "Subscription updated." };
    }

    const { error } = await supabase.from("subscriptions").insert(payload);
    if (error) throw new Error(error.message);
    revalidatePlanningViews();
    return { status: "success", message: "Subscription added." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not save subscription." };
  }
}

export async function setSubscriptionActive(formData: FormData) {
  const { supabase, userId } = await getUserContext();
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Subscription id is required.");
  const { error } = await supabase.from("subscriptions").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePlanningViews();
}

export async function saveAnnualExpense(_previousState: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  try {
    const { supabase, userId } = await getUserContext();
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const categoryName = textValue(formData, "category_name");
    const categoryId = await getOrCreateCategory(supabase, userId, categoryName, "sinking_fund");
    const annualAmount = parseAmount(formData.get("annual_amount"), "Annual amount");
    const dueDate = textValue(formData, "due_date");
    const active = formData.get("active") === "on";

    if (!name) throw new Error("Annual expense name is required.");

    const payload = { user_id: userId, name, category_id: categoryId, annual_amount: annualAmount, due_date: dueDate, active };
    if (id) {
      const { error } = await supabase.from("annual_expenses").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidatePlanningViews();
      return { status: "success", message: "Annual expense updated." };
    }

    const { error } = await supabase.from("annual_expenses").insert(payload);
    if (error) throw new Error(error.message);
    revalidatePlanningViews();
    return { status: "success", message: "Annual expense added." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not save annual expense." };
  }
}

export async function setAnnualExpenseActive(formData: FormData) {
  const { supabase, userId } = await getUserContext();
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Annual expense id is required.");
  const { error } = await supabase.from("annual_expenses").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePlanningViews();
}

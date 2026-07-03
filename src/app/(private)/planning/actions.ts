"use server";

import { revalidatePath } from "next/cache";
import { getFinancialCycle, getUserCycleStartDay } from "@/lib/finance/cycle";
import type { CategoryKind } from "@/lib/finance/types";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

export type PlanningActionState = { status: "idle" | "success" | "error"; message: string };
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
type SubscriptionFrequency = "monthly" | "yearly";
type PlanningMessages = Record<keyof typeof dictionaries.en.planning.messages, string>;

const subscriptionFrequencies: SubscriptionFrequency[] = ["monthly", "yearly"];

function localeFromForm(formData: FormData): Locale {
  const locale = formData.get("locale");
  return isLocale(locale) ? locale : "th";
}

function getMessages(formData: FormData): PlanningMessages {
  return dictionaries[localeFromForm(formData)].planning.messages;
}

async function getUserContext(messages: PlanningMessages = dictionaries.th.planning.messages) {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error(messages.loginAgain);
  return { supabase, userId: user.id };
}

function parseAmount(value: FormDataEntryValue | null, messages: PlanningMessages) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(messages.amountNonNegative);
  return amount;
}

function parseBillingDay(value: FormDataEntryValue | null, messages: PlanningMessages) {
  const day = Number(value ?? 1);
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error(messages.billingDayRange);
  return day;
}

function parseFrequency(value: FormDataEntryValue | null, messages: PlanningMessages): SubscriptionFrequency {
  if (typeof value !== "string" || !subscriptionFrequencies.includes(value as SubscriptionFrequency)) {
    throw new Error(messages.chooseBilling);
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
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserContext(messages);
    const id = textValue(formData, "id");
    const label = textValue(formData, "label");
    const amount = parseAmount(formData.get("amount"), messages);
    const categoryName = textValue(formData, "category_name") ?? label;
    const categoryId = await getOrCreateCategory(supabase, userId, categoryName, "expense");
    const active = formData.get("active") === "on";
    const startDay = await getUserCycleStartDay(supabase, userId);
    const cycleStartDate = textValue(formData, "cycle_start_date") ?? toDateInput(getFinancialCycle(todayAtNoon(), startDay).start);

    if (!label) throw new Error(messages.budgetNameRequired);

    const payload = { user_id: userId, label, amount, category_id: categoryId, cycle_start_date: cycleStartDate, active };
    if (id) {
      const { error } = await supabase.from("budgets").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidatePlanningViews();
      return { status: "success", message: messages.budgetUpdated };
    }

    const { error } = await supabase.from("budgets").insert(payload);
    if (error) throw new Error(error.message);
    revalidatePlanningViews();
    return { status: "success", message: messages.budgetAdded };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : messages.saveBudgetFailed };
  }
}

export async function setBudgetActive(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error(messages.budgetIdRequired);
  const { error } = await supabase.from("budgets").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePlanningViews();
}

export async function deleteBudget(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  if (!id) throw new Error(messages.budgetIdRequired);
  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePlanningViews();
}

export async function saveSubscription(_previousState: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserContext(messages);
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const categoryName = textValue(formData, "category_name");
    const categoryId = await getOrCreateCategory(supabase, userId, categoryName, "subscription");
    const frequency = parseFrequency(formData.get("frequency"), messages);
    const price = parseAmount(formData.get("price"), messages);
    const billingDay = parseBillingDay(formData.get("billing_day"), messages);
    const paymentMethod = textValue(formData, "payment_method");
    const paymentSource = textValue(formData, "payment_source");
    const [sourceKind, sourceId] = paymentSource ? paymentSource.split(":") : [null, null];
    const sourceAccountId = sourceKind === "account" ? sourceId : null;
    const sourceCardId = sourceKind === "card" ? sourceId : null;
    const active = formData.get("active") === "on";

    if (!name) throw new Error(messages.subscriptionNameRequired);

    const payload = {
      user_id: userId,
      name,
      category_id: categoryId,
      frequency,
      price,
      billing_day: billingDay,
      payment_method: paymentMethod,
      source_account_id: sourceAccountId,
      source_card_id: sourceCardId,
      active
    };
    if (id) {
      const { error } = await supabase.from("subscriptions").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidatePlanningViews();
      return { status: "success", message: messages.subscriptionUpdated };
    }

    const { error } = await supabase.from("subscriptions").insert(payload);
    if (error) throw new Error(error.message);
    revalidatePlanningViews();
    return { status: "success", message: messages.subscriptionAdded };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : messages.saveSubscriptionFailed };
  }
}

export async function setSubscriptionActive(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error(messages.subscriptionIdRequired);
  const { error } = await supabase.from("subscriptions").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePlanningViews();
}

export async function deleteSubscription(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  if (!id) throw new Error(messages.subscriptionIdRequired);
  const { error } = await supabase.from("subscriptions").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePlanningViews();
}

export async function saveAnnualExpense(_previousState: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserContext(messages);
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const categoryName = textValue(formData, "category_name");
    const categoryId = await getOrCreateCategory(supabase, userId, categoryName, "sinking_fund");
    const annualAmount = parseAmount(formData.get("annual_amount"), messages);
    const dueDate = textValue(formData, "due_date");
    const reserveAccountId = textValue(formData, "reserve_account_id");
    const active = formData.get("active") === "on";

    if (!name) throw new Error(messages.annualExpenseNameRequired);

    const payload = { user_id: userId, name, category_id: categoryId, annual_amount: annualAmount, due_date: dueDate, reserve_account_id: reserveAccountId, active };
    if (id) {
      const { error } = await supabase.from("annual_expenses").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidatePlanningViews();
      return { status: "success", message: messages.annualExpenseUpdated };
    }

    const { error } = await supabase.from("annual_expenses").insert(payload);
    if (error) throw new Error(error.message);
    revalidatePlanningViews();
    return { status: "success", message: messages.annualExpenseAdded };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : messages.saveAnnualExpenseFailed };
  }
}

export async function setAnnualExpenseActive(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error(messages.annualExpenseIdRequired);
  const { error } = await supabase.from("annual_expenses").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePlanningViews();
}

export async function deleteAnnualExpense(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  if (!id) throw new Error(messages.annualExpenseIdRequired);
  const { error } = await supabase.from("annual_expenses").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePlanningViews();
}

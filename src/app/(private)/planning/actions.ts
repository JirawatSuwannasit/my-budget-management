"use server";

import { revalidatePath } from "next/cache";
import { saveTransaction } from "@/app/(private)/transactions/actions";
import { getFinancialCycle, getUserCycleStartDay } from "@/lib/finance/cycle";
import { selectDueSubscriptionCharges, type ChargeableSubscription, type CycleTransactionLink } from "@/lib/finance/subscription-charges";
import { selectSubscriptionSourcePromotions, type ScheduledSourceSubscription } from "@/lib/finance/subscription-source-promotion";
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

// Schedules a payment-source change for the START of the NEXT billing cycle;
// the current cycle's source_account_id/source_card_id (and any charge already
// due this cycle) are untouched. Pass an empty next_payment_source to cancel a
// pending schedule. Promotion itself happens lazily in
// processDueSubscriptionCharges, on the first app-open of the effective cycle.
export async function setNextSubscriptionSource(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  if (!id) throw new Error(messages.subscriptionIdRequired);

  const nextPaymentSource = textValue(formData, "next_payment_source");
  if (!nextPaymentSource) {
    const { error } = await supabase
      .from("subscriptions")
      .update({ next_source_account_id: null, next_source_card_id: null, next_source_effective_from: null })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    revalidatePlanningViews();
    return;
  }

  const [sourceKind, sourceId] = nextPaymentSource.split(":");
  const nextSourceAccountId = sourceKind === "account" ? sourceId : null;
  const nextSourceCardId = sourceKind === "card" ? sourceId : null;

  const startDay = await getUserCycleStartDay(supabase, userId);
  const currentCycle = getFinancialCycle(todayAtNoon(), startDay);
  const nextCycleProbe = new Date(currentCycle.end.getFullYear(), currentCycle.end.getMonth(), currentCycle.end.getDate() + 1, 12, 0, 0, 0);
  const nextCycle = getFinancialCycle(nextCycleProbe, startDay);

  const { error } = await supabase
    .from("subscriptions")
    .update({ next_source_account_id: nextSourceAccountId, next_source_card_id: nextSourceCardId, next_source_effective_from: toDateInput(nextCycle.start) })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePlanningViews();
}

// Idempotent: a promoted row's next_source_effective_from is cleared, so
// re-running finds nothing left to promote for it (see
// subscription-source-promotion.ts for the pure selection logic under test).
// Failures are swallowed per-row so one bad row can't block the others or the
// charge batch that runs right after this in processDueSubscriptionCharges.
async function promoteScheduledSubscriptionSources(supabase: SupabaseServer, userId: string, cycleStart: Date) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id,next_source_account_id,next_source_card_id,next_source_effective_from")
    .eq("user_id", userId)
    .not("next_source_effective_from", "is", null);
  if (error || !data) return;

  const promotions = selectSubscriptionSourcePromotions({ subscriptions: data as ScheduledSourceSubscription[], cycleStart });
  if (promotions.length === 0) return;

  await Promise.all(
    promotions.map((promotion) =>
      supabase
        .from("subscriptions")
        .update({
          source_account_id: promotion.sourceAccountId,
          source_card_id: promotion.sourceCardId,
          next_source_account_id: null,
          next_source_card_id: null,
          next_source_effective_from: null
        })
        .eq("id", promotion.subscriptionId)
        .eq("user_id", userId)
    )
  );
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

export type SubscriptionChargeResult = { charged: number; skipped: number };

// Lazy materialization: triggered once per app-shell mount (client one-shot effect),
// not by a scheduler. Idempotent — re-running mid-cycle after a successful charge
// re-derives "due" from the DB and finds nothing left to charge for that subscription.
export async function processDueSubscriptionCharges(): Promise<SubscriptionChargeResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) return { charged: 0, skipped: 0 };
  const userId = user.id;

  const startDay = await getUserCycleStartDay(supabase, userId);
  const cycle = getFinancialCycle(todayAtNoon(), startDay);
  const cycleStartKey = toDateInput(cycle.start);

  // Promotion must fully complete before the subscriptions fetch below, so the
  // first app-open of a newly-effective cycle charges from the newly-promoted
  // source rather than the stale one.
  await promoteScheduledSubscriptionSources(supabase, userId, cycle.start);

  const [subscriptionsResult, transactionsResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id,category_id,price,billing_day,frequency,active,source_account_id,source_card_id")
      .eq("user_id", userId)
      .eq("active", true)
      .eq("frequency", "monthly"),
    supabase.from("transactions").select("related_entity_id,cycle_start_date").eq("user_id", userId).eq("cycle_start_date", cycleStartKey)
  ]);
  if (subscriptionsResult.error || transactionsResult.error) return { charged: 0, skipped: 0 };

  const dueCharges = selectDueSubscriptionCharges({
    subscriptions: (subscriptionsResult.data ?? []) as ChargeableSubscription[],
    cycleTransactions: (transactionsResult.data ?? []) as CycleTransactionLink[],
    cycleStart: cycle.start,
    cycleEnd: cycle.end
  });
  if (dueCharges.length === 0) return { charged: 0, skipped: 0 };

  // Pre-check cash-account balances so an insufficient-funds charge is never
  // attempted (no partial/phantom write): card-bound charges never touch a cash
  // balance (credit_card_expense is a liability, not a cash delta), so only
  // account-bound charges need this guard.
  const accountIds = [...new Set(dueCharges.filter((charge) => charge.sourceKind === "account").map((charge) => charge.sourceId))];
  const remainingBalanceById = new Map<string, number>();
  if (accountIds.length > 0) {
    const { data: accountRows, error: accountError } = await supabase.from("accounts").select("id,balance").eq("user_id", userId).in("id", accountIds);
    if (accountError) return { charged: 0, skipped: 0 };
    for (const row of accountRows ?? []) remainingBalanceById.set(row.id, Number(row.balance ?? 0));
  }

  let charged = 0;
  let skipped = 0;
  for (const charge of dueCharges) {
    if (charge.sourceKind === "account") {
      const remaining = remainingBalanceById.get(charge.sourceId) ?? 0;
      if (remaining - charge.amount < 0) {
        skipped += 1;
        continue;
      }
      // Keep a running balance so multiple due charges on the same account this
      // batch can't all be approved against a balance that only covers one of them.
      remainingBalanceById.set(charge.sourceId, remaining - charge.amount);
    }

    try {
      const chargeFormData = new FormData();
      chargeFormData.set("locale", "th");
      chargeFormData.set("type", charge.sourceKind === "card" ? "credit_card_expense" : "expense");
      chargeFormData.set("amount", String(charge.amount));
      chargeFormData.set("category_id", charge.categoryId ?? "");
      chargeFormData.set("expense_related_entity_id", charge.subscriptionId);
      chargeFormData.set("transaction_date", toDateInput(todayAtNoon()));
      chargeFormData.set("notes", "Auto-charged subscription (lazy materialization)");
      if (charge.sourceKind === "card") chargeFormData.set("credit_card_id", charge.sourceId);
      else chargeFormData.set("account_id", charge.sourceId);

      const result = await saveTransaction({ status: "idle", message: "" }, chargeFormData);
      if (result.status === "success") charged += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }

  if (charged > 0) revalidatePlanningViews();
  return { charged, skipped };
}

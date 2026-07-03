import { billingDayDueDate } from "./upcoming";

// Lazy materialization (no scheduler in this stack): on app open we compute which
// active monthly subscriptions, bound to a payment source, are due this cycle and
// not yet charged. Yearly subscriptions use the reserve flow, not a charge, and are
// out of scope for auto-charging this round.

export type ChargeableSubscription = {
  id: string;
  category_id: string | null;
  price: number | string;
  billing_day: number;
  frequency: "monthly" | "yearly";
  active: boolean | null;
  source_account_id: string | null;
  source_card_id: string | null;
};

export type CycleTransactionLink = {
  related_entity_id: string | null;
  cycle_start_date: string;
};

export type DueSubscriptionCharge = {
  subscriptionId: string;
  categoryId: string | null;
  amount: number;
  sourceKind: "account" | "card";
  sourceId: string;
};

type SelectDueParams = {
  subscriptions: ChargeableSubscription[];
  cycleTransactions: CycleTransactionLink[];
  cycleStart: Date;
  cycleEnd: Date;
  today?: Date;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// Pure selection logic, deliberately separate from any Supabase I/O so it can be
// unit tested directly: the correctness invariant here is idempotency. Calling
// this again after a charge for a subscription has landed in `cycleTransactions`
// (related_entity_id === subscription.id, same cycle_start_date) must exclude it.
export function selectDueSubscriptionCharges({ subscriptions, cycleTransactions, cycleStart, cycleEnd, today = new Date() }: SelectDueParams): DueSubscriptionCharge[] {
  const startKey = toDateInput(cycleStart);
  const endKey = toDateInput(cycleEnd);
  const todayKey = toDateInput(today);

  const linkedIds = new Set(
    cycleTransactions
      .filter((transaction) => transaction.cycle_start_date === startKey)
      .map((transaction) => transaction.related_entity_id)
      .filter((id): id is string => Boolean(id))
  );

  const due: DueSubscriptionCharge[] = [];
  for (const subscription of subscriptions) {
    if (subscription.active === false) continue;
    if (subscription.frequency !== "monthly") continue;
    if (linkedIds.has(subscription.id)) continue;

    const sourceKind: "account" | "card" | null = subscription.source_card_id ? "card" : subscription.source_account_id ? "account" : null;
    if (!sourceKind) continue;
    const sourceId = sourceKind === "card" ? subscription.source_card_id : subscription.source_account_id;
    if (!sourceId) continue;

    const dueDate = billingDayDueDate(subscription.billing_day, cycleStart, cycleEnd, startKey, endKey);
    if (!dueDate || todayKey < dueDate) continue;

    due.push({ subscriptionId: subscription.id, categoryId: subscription.category_id, amount: toNumber(subscription.price), sourceKind, sourceId });
  }
  return due;
}

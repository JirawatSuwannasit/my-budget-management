import type { DashboardRows } from "./dashboard-data";

// "Due & to-do this cycle" is a read-only view derived from the same Supabase rows the dashboard
// loads. It never writes data; it only surfaces obligations the user still has to act on this cycle.

// How many days ahead counts as "due soon". Single named constant so it is easy to tune.
export const DUE_SOON_DAYS = 7;

export type UpcomingUrgency = "overdue" | "due-soon" | "pending";
export type UpcomingType = "card_statement" | "annual_bill" | "subscription" | "sinking_fund" | "debt";
export type UpcomingHref = "/planning" | "/debts-cards";

export type UpcomingItem = {
  id: string;
  type: UpcomingType;
  title: string;
  amount: number;
  dueDate: string | null;
  urgency: UpcomingUrgency;
  href: UpcomingHref;
};

export type UpcomingSummary = {
  items: UpcomingItem[];
  overdueCount: number;
  dueSoonCount: number;
  pendingCount: number;
  totalCount: number;
  urgentCount: number;
  allCaughtUp: boolean;
  urgentByHref: Record<UpcomingHref, number>;
};

type BuildUpcomingParams = {
  rows: DashboardRows;
  cycleStart: Date;
  cycleEnd: Date;
  today?: Date;
  dueSoonDays?: number;
};

const URGENCY_RANK: Record<UpcomingUrgency, number> = { overdue: 0, "due-soon": 1, pending: 2 };

export function emptyUpcomingSummary(): UpcomingSummary {
  return {
    items: [],
    overdueCount: 0,
    dueSoonCount: 0,
    pendingCount: 0,
    totalCount: 0,
    urgentCount: 0,
    allCaughtUp: true,
    urgentByHref: { "/planning": 0, "/debts-cards": 0 }
  };
}

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

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12, 0, 0, 0);
}

function clampDayToMonth(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(day, lastDay);
}

function urgencyFor(dueDate: string | null, todayKey: string, soonKey: string): UpcomingUrgency {
  if (!dueDate) return "pending";
  if (dueDate < todayKey) return "overdue";
  if (dueDate <= soonKey) return "due-soon";
  return "pending";
}

// Map a recurring billing day (1..31) onto a concrete date inside the current cycle window.
function billingDayDueDate(billingDay: number, cycleStart: Date, cycleEnd: Date, startKey: string, endKey: string): string | null {
  const months = [
    { year: cycleStart.getFullYear(), month: cycleStart.getMonth() },
    { year: cycleEnd.getFullYear(), month: cycleEnd.getMonth() }
  ];
  for (const { year, month } of months) {
    const key = toDateInput(new Date(year, month, clampDayToMonth(year, month, billingDay), 12));
    if (key >= startKey && key <= endKey) return key;
  }
  return null;
}

export function buildUpcomingItems({ rows, cycleStart, cycleEnd, today = new Date(), dueSoonDays = DUE_SOON_DAYS }: BuildUpcomingParams): UpcomingSummary {
  const todayKey = toDateInput(today);
  const soonKey = toDateInput(addDays(today, dueSoonDays));
  const startKey = toDateInput(cycleStart);
  const endKey = toDateInput(cycleEnd);

  const isActive = <T extends { active: boolean | null }>(row: T) => row.active !== false;
  const cardNameById = new Map(rows.creditCards.map((card) => [card.id, card.name]));
  // An entity is handled this cycle if any transaction is linked to it within the cycle (mirrors the
  // dashboard's isPaidInCycle: a payment or a reserve both count).
  const linkedThisCycle = (entityId: string) =>
    rows.transactions.some((transaction) => transaction.related_entity_id === entityId && transaction.cycle_start_date === startKey);

  const items: UpcomingItem[] = [];

  // 1. Credit card statements still owed.
  for (const statement of rows.creditCardStatements) {
    if (statement.status === "paid") continue;
    const remaining = toNumber(statement.remaining_payable);
    if (remaining <= 0) continue;
    items.push({
      id: "statement-" + statement.id,
      type: "card_statement",
      title: cardNameById.get(statement.card_id) ?? "Credit card",
      amount: remaining,
      dueDate: statement.due_date ?? null,
      urgency: urgencyFor(statement.due_date ?? null, todayKey, soonKey),
      href: "/debts-cards"
    });
  }

  // 2. Annual bills whose due date is approaching/overdue and not yet handled this cycle.
  const annualBillIds = new Set<string>();
  for (const expense of rows.annualExpenses) {
    if (!isActive(expense)) continue;
    const dueDate = expense.due_date ?? null;
    if (!dueDate) continue;
    if (linkedThisCycle(expense.id)) continue;
    const urgency = urgencyFor(dueDate, todayKey, soonKey);
    if (urgency === "pending") continue; // only surface the bill itself once it is approaching
    annualBillIds.add(expense.id);
    items.push({
      id: "annual-bill-" + expense.id,
      type: "annual_bill",
      title: expense.name,
      amount: toNumber(expense.annual_amount),
      dueDate,
      urgency,
      href: "/planning"
    });
  }

  // 3. Active monthly subscriptions not yet paid this cycle.
  for (const subscription of rows.subscriptions) {
    if (!isActive(subscription) || subscription.frequency !== "monthly") continue;
    if (linkedThisCycle(subscription.id)) continue;
    const dueDate = billingDayDueDate(subscription.billing_day, cycleStart, cycleEnd, startKey, endKey);
    items.push({
      id: "subscription-" + subscription.id,
      type: "subscription",
      title: subscription.name,
      amount: toNumber(subscription.price),
      dueDate,
      urgency: urgencyFor(dueDate, todayKey, soonKey),
      href: "/planning"
    });
  }

  // 4. Active sinking funds / yearly subscriptions not yet reserved this cycle.
  for (const expense of rows.annualExpenses) {
    if (!isActive(expense) || annualBillIds.has(expense.id)) continue;
    if (linkedThisCycle(expense.id)) continue;
    items.push({
      id: "reserve-annual-" + expense.id,
      type: "sinking_fund",
      title: expense.name,
      amount: toNumber(expense.monthly_reserve) || toNumber(expense.annual_amount) / 12,
      dueDate: null,
      urgency: "pending",
      href: "/planning"
    });
  }
  for (const subscription of rows.subscriptions) {
    if (!isActive(subscription) || subscription.frequency !== "yearly") continue;
    if (linkedThisCycle(subscription.id)) continue;
    items.push({
      id: "reserve-sub-" + subscription.id,
      type: "sinking_fund",
      title: subscription.name,
      amount: toNumber(subscription.price) / 12,
      dueDate: null,
      urgency: "pending",
      href: "/planning"
    });
  }

  // 5. Active debts whose monthly payment has not been fully recorded this cycle.
  for (const debt of rows.debts) {
    if (!isActive(debt)) continue;
    const monthly = toNumber(debt.monthly_payment);
    if (monthly <= 0) continue;
    const paidThisCycle = rows.debtPayments
      .filter((payment) => payment.debt_id === debt.id && payment.paid_date >= startKey && payment.paid_date <= endKey)
      .reduce((total, payment) => total + toNumber(payment.amount), 0);
    const remaining = monthly - paidThisCycle;
    if (remaining <= 0) continue;
    items.push({
      id: "debt-" + debt.id,
      type: "debt",
      title: debt.name,
      amount: remaining,
      dueDate: null,
      urgency: "pending",
      href: "/debts-cards"
    });
  }

  items.sort((a, b) => {
    if (URGENCY_RANK[a.urgency] !== URGENCY_RANK[b.urgency]) return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return a.title.localeCompare(b.title);
  });

  const overdueCount = items.filter((item) => item.urgency === "overdue").length;
  const dueSoonCount = items.filter((item) => item.urgency === "due-soon").length;
  const pendingCount = items.filter((item) => item.urgency === "pending").length;
  const urgentByHref: Record<UpcomingHref, number> = { "/planning": 0, "/debts-cards": 0 };
  for (const item of items) {
    if (item.urgency === "overdue" || item.urgency === "due-soon") urgentByHref[item.href] += 1;
  }

  return {
    items,
    overdueCount,
    dueSoonCount,
    pendingCount,
    totalCount: items.length,
    urgentCount: overdueCount + dueSoonCount,
    allCaughtUp: items.length === 0,
    urgentByHref
  };
}

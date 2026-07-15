import { computeCardObligation, type DashboardRows } from "./dashboard-data";

// "Due & to-do this cycle" is a read-only view derived from the same Supabase rows the dashboard
// loads. It never writes data; it only surfaces obligations the user still has to act on this cycle.

// How many days ahead counts as "due soon". Single named constant so it is easy to tune.
export const DUE_SOON_DAYS = 7;

export type UpcomingUrgency = "overdue" | "due-soon" | "pending";
export type UpcomingType = "card_statement" | "annual_bill" | "subscription" | "sinking_fund" | "debt" | "low_balance";
export type UpcomingHref = "/planning" | "/debts-cards" | "/accounts";

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
    urgentByHref: { "/planning": 0, "/debts-cards": 0, "/accounts": 0 }
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

// The next occurrence of payment_due_day strictly after the last billing cut
// (a due day numerically before/at the cut day rolls into the following month,
// the common real-world layout; a due day after the cut day stays same-month).
function nextDueDateAfterCut(lastCut: Date, paymentDueDay: number): Date {
  const sameMonth = new Date(lastCut.getFullYear(), lastCut.getMonth(), clampDayToMonth(lastCut.getFullYear(), lastCut.getMonth(), paymentDueDay), 12);
  if (sameMonth.getTime() > lastCut.getTime()) return sameMonth;
  return new Date(lastCut.getFullYear(), lastCut.getMonth() + 1, clampDayToMonth(lastCut.getFullYear(), lastCut.getMonth() + 1, paymentDueDay), 12);
}

function urgencyFor(dueDate: string | null, todayKey: string, soonKey: string): UpcomingUrgency {
  if (!dueDate) return "pending";
  if (dueDate < todayKey) return "overdue";
  if (dueDate <= soonKey) return "due-soon";
  return "pending";
}

// Map a recurring billing day (1..31) onto a concrete date inside the current cycle window.
// Exported so callers (e.g. subscription auto-charge) reuse the exact same "due this cycle" rule.
export function billingDayDueDate(billingDay: number, cycleStart: Date, cycleEnd: Date, startKey: string, endKey: string): string | null {
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

  // 1. Credit cards with a billed (already cut) outstanding balance.
  for (const card of rows.creditCards) {
    if (!isActive(card)) continue;
    const obligation = computeCardObligation(
      {
        billingCutDay: card.billing_cut_day,
        cardTransactions: rows.cardTransactions.filter((transaction) => transaction.card_id === card.id),
        cardPayments: rows.cardPayments.filter((payment) => payment.card_id === card.id)
      },
      today
    );
    if (obligation.billedOutstanding <= 0) continue;
    const dueDate = toDateInput(nextDueDateAfterCut(obligation.lastCut, card.payment_due_day));
    items.push({
      id: "card-" + card.id,
      type: "card_statement",
      title: cardNameById.get(card.id) ?? "Credit card",
      amount: obligation.billedOutstanding,
      dueDate,
      urgency: urgencyFor(dueDate, todayKey, soonKey),
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
    // Card-linked installments are auto-charged into the card float; their
    // reminder now comes from the card statement item above (section 1), which
    // already includes the auto-charged amount once it bills.
    if (debt.type === "installment" && debt.card_id) continue;
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

  // 6. Active accounts whose current balance has fallen below their optional
  // low-balance threshold. Compares the raw stored balance directly (not the
  // dashboard's safe-to-spend figure); this display surfaces only here in the
  // Upcoming panel, never on the Accounts page itself.
  for (const account of rows.accounts) {
    if (!isActive(account)) continue;
    if (account.low_balance_threshold === null || account.low_balance_threshold === undefined) continue;
    if (toNumber(account.balance) >= toNumber(account.low_balance_threshold)) continue;
    items.push({
      id: "low-balance-" + account.id,
      type: "low_balance",
      title: account.name,
      amount: toNumber(account.balance),
      dueDate: null,
      urgency: "due-soon",
      href: "/accounts"
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
  const urgentByHref: Record<UpcomingHref, number> = { "/planning": 0, "/debts-cards": 0, "/accounts": 0 };
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

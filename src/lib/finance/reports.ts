import { getFinancialCycle } from "./cycle";
import type { DashboardRows } from "./dashboard-data";

// Reports are a read-only view over the same Supabase rows the dashboard already loads.
// All money figures are derived by grouping transactions on their stored cycle_start_date,
// so they stay consistent with how the dashboard buckets the current cycle and respect the
// "changing the start day is not retroactive" rule from Phase 9.1.

export type ReportCategory = { id: string; name: string; active: boolean };

export type CycleSummary = {
  cycleStartDate: string;
  start: Date;
  end: Date;
  label: string;
  income: number;
  expenses: number;
  investmentTransfers: number;
  debtPaid: number;
  sinkingReserved: number;
  net: number;
  isCurrent: boolean;
};

export type CategorySlice = {
  categoryId: string | null;
  label: string;
  amount: number;
  share: number;
};

export type CategoryBreakdown = {
  cycleStartDate: string;
  total: number;
  slices: CategorySlice[];
};

export type DebtTrajectoryPoint = {
  cycleStartDate: string;
  start: Date;
  label: string;
  remaining: number;
};

export type ReportsData = {
  cycles: CycleSummary[];
  selectedCycleStartDate: string;
  categoryBreakdown: CategoryBreakdown;
  debtTrajectory: DebtTrajectoryPoint[];
  hasHistory: boolean;
};

type BuildReportsParams = {
  rows: DashboardRows;
  categories: ReportCategory[];
  startDay: number;
  today?: Date;
  selectedCycleStartDate?: string;
  maxCycles?: number;
  maxTrendCycles?: number;
  maxCategorySlices?: number;
  noCategoryLabel: string;
  otherLabel: string;
};

const DEFAULT_MAX_CYCLES = 12;
const DEFAULT_MAX_TREND_CYCLES = 12;
const DEFAULT_MAX_CATEGORY_SLICES = 8;

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

// Local-noon formatting that matches how transactions store cycle_start_date (see transactions actions).
function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function parseCycleStartDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

// The cycle end for a stored start is always (its own start day - 1) of the following month.
// Using the start date's own day keeps historical cycles correct even if the configured start
// day changed later (Phase 9.1 is not retroactive).
function cycleEndForStart(start: Date) {
  return new Date(start.getFullYear(), start.getMonth() + 1, start.getDate() - 1, 12, 0, 0, 0);
}

function formatCycleDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function buildReportsData({
  rows,
  categories,
  startDay,
  today = new Date(),
  selectedCycleStartDate,
  maxCycles = DEFAULT_MAX_CYCLES,
  maxTrendCycles = DEFAULT_MAX_TREND_CYCLES,
  maxCategorySlices = DEFAULT_MAX_CATEGORY_SLICES,
  noCategoryLabel,
  otherLabel
}: BuildReportsParams): ReportsData {
  const hasCategoryRows = categories.length > 0;
  const activeCategoryIds = new Set(categories.filter((category) => category.active).map((category) => category.id));
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  // Mirrors the dashboard's category filter so per-cycle totals match the dashboard exactly.
  const categoryActiveOrMissing = (categoryId: string | null) => !categoryId || !hasCategoryRows || activeCategoryIds.has(categoryId);

  const currentCycle = getFinancialCycle(today, startDay);
  const currentCycleKey = toDateInput(currentCycle.start);

  // Collect every cycle that has transactions, plus the current cycle so it always appears.
  const cycleKeys = new Set<string>([currentCycleKey]);
  for (const transaction of rows.transactions) {
    if (transaction.cycle_start_date) cycleKeys.add(transaction.cycle_start_date);
  }

  const orderedKeys = [...cycleKeys].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  const recentKeys = orderedKeys.slice(0, maxCycles);

  const cycles: CycleSummary[] = recentKeys.map((key) => {
    const start = parseCycleStartDate(key);
    const end = cycleEndForStart(start);
    const cycleTransactions = rows.transactions
      .filter((transaction) => transaction.cycle_start_date === key)
      .filter((transaction) => categoryActiveOrMissing(transaction.category_id));

    const sumByType = (type: string) =>
      cycleTransactions.filter((transaction) => transaction.type === type).reduce((total, transaction) => total + toNumber(transaction.amount), 0);
    const sumByTypes = (types: string[]) =>
      cycleTransactions.filter((transaction) => types.includes(transaction.type)).reduce((total, transaction) => total + toNumber(transaction.amount), 0);

    const income = sumByType("income");
    // Reports count card spend at transaction time (the moment it is charged),
    // deliberately diverging from the dashboard's grace-period figure.
    const expenses = sumByTypes(["expense", "credit_card_expense"]);

    return {
      cycleStartDate: key,
      start,
      end,
      label: formatCycleDate(start) + " - " + formatCycleDate(end),
      income,
      expenses,
      investmentTransfers: sumByType("investment_transfer"),
      debtPaid: sumByType("debt_payment"),
      sinkingReserved: sumByType("sinking_fund_reserve"),
      net: income - expenses,
      isCurrent: key === currentCycleKey
    };
  });

  const selectedKey = selectedCycleStartDate && recentKeys.includes(selectedCycleStartDate) ? selectedCycleStartDate : currentCycleKey;

  const categoryBreakdown = buildCategoryBreakdown({
    rows,
    selectedKey,
    categoryActiveOrMissing,
    categoryNameById,
    noCategoryLabel,
    otherLabel,
    maxCategorySlices
  });

  const debtTrajectory = buildDebtTrajectory({
    rows,
    cycles: [...cycles].slice(0, maxTrendCycles)
  });

  const hasHistory = rows.transactions.length > 0 || rows.debts.length > 0;

  return {
    cycles,
    selectedCycleStartDate: selectedKey,
    categoryBreakdown,
    debtTrajectory,
    hasHistory
  };
}

function buildCategoryBreakdown({
  rows,
  selectedKey,
  categoryActiveOrMissing,
  categoryNameById,
  noCategoryLabel,
  otherLabel,
  maxCategorySlices
}: {
  rows: DashboardRows;
  selectedKey: string;
  categoryActiveOrMissing: (categoryId: string | null) => boolean;
  categoryNameById: Map<string, string>;
  noCategoryLabel: string;
  otherLabel: string;
  maxCategorySlices: number;
}): CategoryBreakdown {
  const expenses = rows.transactions
    .filter((transaction) => transaction.cycle_start_date === selectedKey)
    .filter((transaction) => transaction.type === "expense" || transaction.type === "credit_card_expense")
    .filter((transaction) => categoryActiveOrMissing(transaction.category_id));

  const totals = new Map<string | null, number>();
  for (const transaction of expenses) {
    const key = transaction.category_id;
    totals.set(key, (totals.get(key) ?? 0) + toNumber(transaction.amount));
  }

  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  const sorted = [...totals.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      label: categoryId ? categoryNameById.get(categoryId) ?? noCategoryLabel : noCategoryLabel,
      amount
    }))
    .sort((a, b) => b.amount - a.amount);

  const top = sorted.slice(0, maxCategorySlices);
  const rest = sorted.slice(maxCategorySlices);
  const slices: CategorySlice[] = top.map((slice) => ({
    ...slice,
    share: total > 0 ? slice.amount / total : 0
  }));

  if (rest.length > 0) {
    const restAmount = rest.reduce((sum, slice) => sum + slice.amount, 0);
    slices.push({
      categoryId: null,
      label: otherLabel,
      amount: restAmount,
      share: total > 0 ? restAmount / total : 0
    });
  }

  return { cycleStartDate: selectedKey, total, slices };
}

function buildDebtTrajectory({ rows, cycles }: { rows: DashboardRows; cycles: CycleSummary[] }): DebtTrajectoryPoint[] {
  const activeDebtIds = new Set(rows.debts.filter((debt) => debt.active !== false).map((debt) => debt.id));
  const currentRemaining = rows.debts
    .filter((debt) => debt.active !== false)
    .reduce((total, debt) => total + toNumber(debt.remaining_balance), 0);

  // Reconstruct the balance at the end of each cycle by adding back payments made after that cycle.
  const relevantPayments = rows.debtPayments.filter((payment) => activeDebtIds.has(payment.debt_id));

  // cycles arrive most-recent-first; render oldest-first for a left-to-right trajectory.
  const chronological = [...cycles].reverse();
  return chronological.map((cycle) => {
    const endKey = toDateInput(cycle.end);
    const paidAfter = relevantPayments
      .filter((payment) => payment.paid_date > endKey)
      .reduce((total, payment) => total + toNumber(payment.amount), 0);
    return {
      cycleStartDate: cycle.cycleStartDate,
      start: cycle.start,
      label: cycle.label,
      remaining: Math.max(0, currentRemaining + paidAfter)
    };
  });
}

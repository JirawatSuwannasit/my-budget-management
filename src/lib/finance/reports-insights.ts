import type { ReportsData } from "./reports";

// Pure, testable derivation layer over ReportsData. No new data sources, no DB
// reads — everything here is arithmetic over cycles/categoryBreakdown/debtTrajectory
// that buildReportsData already computed.

export type SpendTrend = { direction: "up" | "down" | "flat"; percent: number } | null;

export type DebtProjection = { cyclesRemaining: number; projectedPayoffLabel: string } | null;

export type ReportInsights = {
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  avgMonthlyNet: number;
  currentSavingsRate: number; // net / income for the most recent cycle, 0 if income <= 0
  avgSavingsRate: number; // average of per-cycle (net / income) across cycles with income > 0
  spendTrend: SpendTrend; // latest cycle expenses vs the trailing average of the rest
  topCategoryLabel: string | null;
  topCategoryShare: number; // 0..1
  top3CategoryShare: number; // 0..1, concentration of the top 3 categories
  totalDebtPaid: number; // sum of debtPaid across all cycles in the window
  debtProjection: DebtProjection; // linear projection to zero, or null if not decreasing / insufficient data
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Guarded net/income ratio, shared with the per-cycle chart series in reports-view.tsx
// so the "how do we compute savings rate safely" logic has one source of truth.
export function savingsRateFor(income: number, net: number) {
  return income > 0 ? net / income : 0;
}

export function deriveReportInsights(data: ReportsData): ReportInsights {
  const { cycles, categoryBreakdown, debtTrajectory } = data;

  const avgMonthlyIncome = average(cycles.map((cycle) => cycle.income));
  const avgMonthlyExpense = average(cycles.map((cycle) => cycle.expenses));
  const avgMonthlyNet = average(cycles.map((cycle) => cycle.net));

  // cycles is most-recent-first.
  const latestCycle = cycles[0] ?? null;
  const currentSavingsRate = latestCycle ? savingsRateFor(latestCycle.income, latestCycle.net) : 0;
  const cyclesWithIncome = cycles.filter((cycle) => cycle.income > 0);
  const avgSavingsRate = cyclesWithIncome.length > 0 ? average(cyclesWithIncome.map((cycle) => savingsRateFor(cycle.income, cycle.net))) : 0;

  let spendTrend: SpendTrend = null;
  if (cycles.length >= 2 && latestCycle) {
    const trailing = cycles.slice(1);
    const trailingAvgExpense = average(trailing.map((cycle) => cycle.expenses));
    if (trailingAvgExpense > 0) {
      const percent = ((latestCycle.expenses - trailingAvgExpense) / trailingAvgExpense) * 100;
      const direction = percent > 1 ? "up" : percent < -1 ? "down" : "flat";
      spendTrend = { direction, percent: Math.abs(percent) };
    }
  }

  const topSlice = categoryBreakdown.slices[0] ?? null;
  const topCategoryLabel = topSlice ? topSlice.label : null;
  const topCategoryShare = topSlice ? topSlice.share : 0;
  const top3CategoryShare = categoryBreakdown.slices.slice(0, 3).reduce((sum, slice) => sum + slice.share, 0);

  const totalDebtPaid = cycles.reduce((sum, cycle) => sum + cycle.debtPaid, 0);

  let debtProjection: DebtProjection = null;
  if (debtTrajectory.length >= 2) {
    const first = debtTrajectory[0];
    const last = debtTrajectory[debtTrajectory.length - 1];
    const cyclesElapsed = debtTrajectory.length - 1;
    const perCycleDecline = (first.remaining - last.remaining) / cyclesElapsed;
    if (perCycleDecline > 0 && last.remaining > 0) {
      const cyclesRemaining = Math.ceil(last.remaining / perCycleDecline);
      const cycleLengthMs = last.start.getTime() - (debtTrajectory[debtTrajectory.length - 2]?.start.getTime() ?? last.start.getTime());
      const projectedDate = cycleLengthMs > 0 ? new Date(last.start.getTime() + cycleLengthMs * cyclesRemaining) : last.start;
      const projectedPayoffLabel = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(projectedDate);
      debtProjection = { cyclesRemaining, projectedPayoffLabel };
    }
  }

  return {
    avgMonthlyIncome,
    avgMonthlyExpense,
    avgMonthlyNet,
    currentSavingsRate,
    avgSavingsRate,
    spendTrend,
    topCategoryLabel,
    topCategoryShare,
    top3CategoryShare,
    totalDebtPaid,
    debtProjection
  };
}

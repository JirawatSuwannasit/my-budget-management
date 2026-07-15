import { describe, expect, it } from "vitest";
import { deriveReportInsights } from "./reports-insights";
import type { CycleSummary, ReportsData } from "./reports";

function cycle(overrides: Partial<CycleSummary> = {}): CycleSummary {
  return {
    cycleStartDate: "2026-07-25",
    start: new Date(2026, 6, 25, 12),
    end: new Date(2026, 7, 24, 12),
    label: "25 Jul 2026 - 24 Aug 2026",
    income: 0,
    expenses: 0,
    investmentTransfers: 0,
    debtPaid: 0,
    sinkingReserved: 0,
    net: 0,
    isCurrent: true,
    ...overrides
  };
}

function reportsData(overrides: Partial<ReportsData> = {}): ReportsData {
  return {
    cycles: [],
    selectedCycleStartDate: "2026-07-25",
    categoryBreakdown: { cycleStartDate: "2026-07-25", total: 0, slices: [] },
    debtTrajectory: [],
    hasHistory: true,
    ...overrides
  };
}

describe("deriveReportInsights", () => {
  it("computes averages, savings rate, spend trend, top category, and a debt projection on a full history", () => {
    // Most-recent-first, matching buildReportsData's ordering.
    const cycles: CycleSummary[] = [
      cycle({ cycleStartDate: "2026-07-25", start: new Date(2026, 6, 25, 12), income: 90000, expenses: 40000, net: 50000, debtPaid: 9000, isCurrent: true }),
      cycle({ cycleStartDate: "2026-06-25", start: new Date(2026, 5, 25, 12), income: 90000, expenses: 30000, net: 60000, debtPaid: 9000, isCurrent: false }),
      cycle({ cycleStartDate: "2026-05-25", start: new Date(2026, 4, 25, 12), income: 90000, expenses: 30000, net: 60000, debtPaid: 9000, isCurrent: false })
    ];
    const data = reportsData({
      cycles,
      categoryBreakdown: {
        cycleStartDate: "2026-07-25",
        total: 40000,
        slices: [
          { categoryId: "rent", label: "Rent", amount: 20000, share: 0.5 },
          { categoryId: "food", label: "Food", amount: 12000, share: 0.3 },
          { categoryId: "other", label: "Other", amount: 8000, share: 0.2 }
        ]
      },
      debtTrajectory: [
        { cycleStartDate: "2026-05-25", start: new Date(2026, 4, 25, 12), label: "May", remaining: 518000 },
        { cycleStartDate: "2026-06-25", start: new Date(2026, 5, 25, 12), label: "Jun", remaining: 509000 },
        { cycleStartDate: "2026-07-25", start: new Date(2026, 6, 25, 12), label: "Jul", remaining: 500000 }
      ]
    });

    const insights = deriveReportInsights(data);

    expect(insights.avgMonthlyIncome).toBe(90000);
    expect(insights.avgMonthlyExpense).toBeCloseTo((40000 + 30000 + 30000) / 3, 5);
    expect(insights.avgMonthlyNet).toBeCloseTo((50000 + 60000 + 60000) / 3, 5);
    expect(insights.currentSavingsRate).toBeCloseTo(50000 / 90000, 5);
    expect(insights.avgSavingsRate).toBeCloseTo((50000 / 90000 + 60000 / 90000 + 60000 / 90000) / 3, 5);

    // Latest expense (40000) vs trailing average of the other two (30000): +33.3%, "up".
    expect(insights.spendTrend).not.toBeNull();
    expect(insights.spendTrend?.direction).toBe("up");
    expect(insights.spendTrend?.percent).toBeCloseTo(33.333, 2);

    expect(insights.topCategoryLabel).toBe("Rent");
    expect(insights.topCategoryShare).toBeCloseTo(0.5, 5);
    expect(insights.top3CategoryShare).toBeCloseTo(1, 5);

    expect(insights.totalDebtPaid).toBe(27000);

    // Declining by 9000/cycle from 500000 -> ceil(500000/9000) = 56 cycles remaining.
    expect(insights.debtProjection).not.toBeNull();
    expect(insights.debtProjection?.cyclesRemaining).toBe(56);
    expect(insights.debtProjection?.projectedPayoffLabel).toBeTruthy();
  });

  it("degrades gracefully with no history (empty cycles, no categories, no debt)", () => {
    const data = reportsData();
    const insights = deriveReportInsights(data);

    expect(insights.avgMonthlyIncome).toBe(0);
    expect(insights.avgMonthlyExpense).toBe(0);
    expect(insights.avgMonthlyNet).toBe(0);
    expect(insights.currentSavingsRate).toBe(0);
    expect(insights.avgSavingsRate).toBe(0);
    expect(insights.spendTrend).toBeNull();
    expect(insights.topCategoryLabel).toBeNull();
    expect(insights.topCategoryShare).toBe(0);
    expect(insights.top3CategoryShare).toBe(0);
    expect(insights.totalDebtPaid).toBe(0);
    expect(insights.debtProjection).toBeNull();
  });

  it("returns a null spend trend and debt projection with only a single cycle", () => {
    const data = reportsData({
      cycles: [cycle({ income: 90000, expenses: 40000, net: 50000 })],
      debtTrajectory: [{ cycleStartDate: "2026-07-25", start: new Date(2026, 6, 25, 12), label: "Jul", remaining: 500000 }]
    });

    const insights = deriveReportInsights(data);

    expect(insights.avgMonthlyIncome).toBe(90000);
    expect(insights.spendTrend).toBeNull(); // needs >= 2 cycles
    expect(insights.debtProjection).toBeNull(); // needs >= 2 trajectory points
  });

  it("guards against divide-by-zero when a cycle has zero income", () => {
    const data = reportsData({
      cycles: [
        cycle({ cycleStartDate: "2026-07-25", income: 0, expenses: 5000, net: -5000, isCurrent: true }),
        cycle({ cycleStartDate: "2026-06-25", income: 0, expenses: 4000, net: -4000, isCurrent: false })
      ]
    });

    const insights = deriveReportInsights(data);

    // No cycle has positive income, so both rates fall back to 0 rather than NaN/Infinity.
    expect(insights.currentSavingsRate).toBe(0);
    expect(insights.avgSavingsRate).toBe(0);
    expect(Number.isFinite(insights.currentSavingsRate)).toBe(true);
    expect(Number.isFinite(insights.avgSavingsRate)).toBe(true);
  });

  it("only averages the savings rate across cycles that had income", () => {
    const data = reportsData({
      cycles: [
        cycle({ cycleStartDate: "2026-07-25", income: 90000, expenses: 45000, net: 45000, isCurrent: true }),
        cycle({ cycleStartDate: "2026-06-25", income: 0, expenses: 2000, net: -2000, isCurrent: false })
      ]
    });

    const insights = deriveReportInsights(data);

    // Only the income-bearing cycle contributes to the average.
    expect(insights.avgSavingsRate).toBeCloseTo(0.5, 5);
  });

  it("does not project a payoff when the debt balance is flat or increasing", () => {
    const data = reportsData({
      debtTrajectory: [
        { cycleStartDate: "2026-06-25", start: new Date(2026, 5, 25, 12), label: "Jun", remaining: 500000 },
        { cycleStartDate: "2026-07-25", start: new Date(2026, 6, 25, 12), label: "Jul", remaining: 500000 }
      ]
    });

    const insights = deriveReportInsights(data);
    expect(insights.debtProjection).toBeNull();
  });

  it("treats a fully paid-off debt (remaining 0) as having no further projection", () => {
    const data = reportsData({
      debtTrajectory: [
        { cycleStartDate: "2026-06-25", start: new Date(2026, 5, 25, 12), label: "Jun", remaining: 9000 },
        { cycleStartDate: "2026-07-25", start: new Date(2026, 6, 25, 12), label: "Jul", remaining: 0 }
      ]
    });

    const insights = deriveReportInsights(data);
    expect(insights.debtProjection).toBeNull();
  });
});

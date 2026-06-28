import { describe, expect, it } from "vitest";
import { buildReportsData, type ReportCategory } from "./reports";
import { getFinancialCycle } from "./cycle";
import { mapDashboardRowsToInput, type DashboardRows } from "./dashboard-data";
import { calculateDashboardSnapshot } from "./dashboard";

function rows(overrides: Partial<DashboardRows> = {}): DashboardRows {
  return {
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    subscriptions: [],
    annualExpenses: [],
    debts: [],
    debtPayments: [],
    creditCards: [],
    creditCardStatements: [],
    cardTransactions: [],
    ...overrides
  };
}

const categories: ReportCategory[] = [
  { id: "daily", name: "Daily food", active: true },
  { id: "shopping", name: "Shopping", active: false }
];

function sampleRows() {
  return rows({
    categories: [
      { id: "daily", active: true },
      { id: "shopping", active: false }
    ],
    transactions: [
      { id: "inc", account_id: "main", category_id: null, type: "income", amount: "90000", transaction_date: "2026-07-25", cycle_start_date: "2026-07-25", related_entity_id: null },
      { id: "exp", account_id: "main", category_id: "daily", type: "expense", amount: "4000", transaction_date: "2026-07-26", cycle_start_date: "2026-07-25", related_entity_id: null },
      { id: "exp-inactive", account_id: "main", category_id: "shopping", type: "expense", amount: "5000", transaction_date: "2026-07-27", cycle_start_date: "2026-07-25", related_entity_id: null },
      { id: "inv", account_id: "main", category_id: null, type: "investment_transfer", amount: "10000", transaction_date: "2026-07-28", cycle_start_date: "2026-07-25", related_entity_id: null },
      { id: "debt", account_id: "main", category_id: null, type: "debt_payment", amount: "9000", transaction_date: "2026-08-01", cycle_start_date: "2026-07-25", related_entity_id: "d1" },
      { id: "reserve", account_id: null, category_id: null, type: "sinking_fund_reserve", amount: "1000", transaction_date: "2026-07-29", cycle_start_date: "2026-07-25", related_entity_id: null },
      { id: "prev-inc", account_id: "main", category_id: null, type: "income", amount: "88000", transaction_date: "2026-06-25", cycle_start_date: "2026-06-25", related_entity_id: null },
      { id: "prev-exp", account_id: "main", category_id: "daily", type: "expense", amount: "3000", transaction_date: "2026-06-26", cycle_start_date: "2026-06-25", related_entity_id: null }
    ],
    debts: [{ id: "d1", name: "Main debt", remaining_balance: "491000", monthly_payment: "9000", active: true }],
    debtPayments: [
      { id: "p-old", debt_id: "d1", amount: "9000", paid_date: "2026-07-01" },
      { id: "p-new", debt_id: "d1", amount: "9000", paid_date: "2026-08-01" }
    ]
  });
}

const params = {
  startDay: 25,
  today: new Date(2026, 7, 10, 9),
  noCategoryLabel: "No category",
  otherLabel: "Other"
};

describe("buildReportsData", () => {
  it("groups transactions into cycles and computes per-cycle totals and net", () => {
    const data = buildReportsData({ rows: sampleRows(), categories, ...params });

    expect(data.cycles.map((cycle) => cycle.cycleStartDate)).toEqual(["2026-07-25", "2026-06-25"]);
    const current = data.cycles[0];
    expect(current.isCurrent).toBe(true);
    expect(current.income).toBe(90000);
    expect(current.expenses).toBe(4000); // inactive-category expense excluded
    expect(current.investmentTransfers).toBe(10000);
    expect(current.debtPaid).toBe(9000);
    expect(current.sinkingReserved).toBe(1000);
    expect(current.net).toBe(86000);
    expect(current.label).toBe("25 Jul 2026 - 24 Aug 2026");
  });

  it("matches the dashboard income and investment transfers for the current cycle", () => {
    const data = buildReportsData({ rows: sampleRows(), categories, ...params });
    const cycle = getFinancialCycle(params.today, params.startDay);
    const snapshot = calculateDashboardSnapshot(mapDashboardRowsToInput(sampleRows(), cycle.start, cycle.end));

    expect(data.cycles[0].income).toBe(snapshot.cycleIncome);
    expect(data.cycles[0].investmentTransfers).toBe(snapshot.investmentTransfersThisCycle);
  });

  it("always includes the current cycle even with no history", () => {
    const data = buildReportsData({ rows: rows(), categories: [], ...params });

    expect(data.cycles).toHaveLength(1);
    expect(data.cycles[0].cycleStartDate).toBe("2026-07-25");
    expect(data.cycles[0].income).toBe(0);
    expect(data.hasHistory).toBe(false);
  });

  it("breaks down spending by active category with shares of total", () => {
    const data = buildReportsData({ rows: sampleRows(), categories, ...params });

    expect(data.selectedCycleStartDate).toBe("2026-07-25");
    expect(data.categoryBreakdown.total).toBe(4000);
    expect(data.categoryBreakdown.slices).toEqual([
      { categoryId: "daily", label: "Daily food", amount: 4000, share: 1 }
    ]);
  });

  it("uses category names from the provided list", () => {
    const data = buildReportsData({ rows: sampleRows(), categories, ...params });
    expect(data.categoryBreakdown.slices[0].label).toBe("Daily food");
  });

  it("can select a previous cycle for the category breakdown", () => {
    const data = buildReportsData({ rows: sampleRows(), categories, selectedCycleStartDate: "2026-06-25", ...params });

    expect(data.selectedCycleStartDate).toBe("2026-06-25");
    expect(data.categoryBreakdown.total).toBe(3000);
  });

  it("reconstructs the debt payoff trajectory oldest-first", () => {
    const data = buildReportsData({ rows: sampleRows(), categories, ...params });

    expect(data.debtTrajectory).toEqual([
      { cycleStartDate: "2026-06-25", start: new Date(2026, 5, 25, 12), label: "25 Jun 2026 - 24 Jul 2026", remaining: 500000 },
      { cycleStartDate: "2026-07-25", start: new Date(2026, 6, 25, 12), label: "25 Jul 2026 - 24 Aug 2026", remaining: 491000 }
    ]);
  });

  it("groups overflow categories into an Other slice", () => {
    const manyCategoryRows = rows({
      categories: Array.from({ length: 10 }, (_, index) => ({ id: "c" + index, active: true })),
      transactions: Array.from({ length: 10 }, (_, index) => ({
        id: "t" + index,
        account_id: "main",
        category_id: "c" + index,
        type: "expense",
        amount: String((index + 1) * 100),
        transaction_date: "2026-07-26",
        cycle_start_date: "2026-07-25",
        related_entity_id: null
      }))
    });
    const manyCategories = Array.from({ length: 10 }, (_, index) => ({ id: "c" + index, name: "Cat " + index, active: true }));
    const data = buildReportsData({ rows: manyCategoryRows, categories: manyCategories, ...params, maxCategorySlices: 8 });

    expect(data.categoryBreakdown.slices).toHaveLength(9);
    expect(data.categoryBreakdown.slices[8].label).toBe("Other");
    const shareSum = data.categoryBreakdown.slices.reduce((sum, slice) => sum + slice.share, 0);
    expect(shareSum).toBeCloseTo(1, 5);
  });
});

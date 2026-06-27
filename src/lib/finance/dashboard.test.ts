import { describe, expect, it } from "vitest";
import { getCycleStartForSalaryPayment, getFinancialCycle } from "./cycle";
import { calculateDashboardSnapshot } from "./dashboard";
import { getAccountBalanceDeltas } from "./transaction-effects";
import { hasRealDashboardRows, mapDashboardRowsToInput, type DashboardRows } from "./dashboard-data";
import { sampleDashboardInput } from "./sample-data";
import type { DashboardInput } from "./types";

function testInput(overrides: Partial<DashboardInput> = {}): DashboardInput {
  return {
    ...structuredClone(sampleDashboardInput),
    ...overrides
  };
}

describe("calculateDashboardSnapshot", () => {
  it("uses only cash-like accounts for real available money", () => {
    const snapshot = calculateDashboardSnapshot(testInput());

    expect(snapshot.cashLikeBalance).toBe(97800);
    expect(snapshot.realAvailableMoney).toBe(35851);
  });

  it("excludes investment accounts from real available money", () => {
    const baseline = calculateDashboardSnapshot(testInput());
    const input = testInput({
      accounts: sampleDashboardInput.accounts.map((account) =>
        account.type === "investment" ? { ...account, balance: account.balance + 999999 } : account
      )
    });
    const snapshot = calculateDashboardSnapshot(input);

    expect(snapshot.investmentBalance).toBe(baseline.investmentBalance + 999999);
    expect(snapshot.realAvailableMoney).toBe(baseline.realAvailableMoney);
  });

  it("does not subtract paid obligations again", () => {
    const baseline = calculateDashboardSnapshot(testInput());
    const input = testInput({
      obligations: sampleDashboardInput.obligations.map((obligation) =>
        obligation.paid ? { ...obligation, amount: obligation.amount + 50000 } : obligation
      )
    });
    const snapshot = calculateDashboardSnapshot(input);

    expect(snapshot.unpaidObligations).toBe(baseline.unpaidObligations);
    expect(snapshot.realAvailableMoney).toBe(baseline.realAvailableMoney);
  });

  it("subtracts unpaid obligations from real available money", () => {
    const input = testInput({
      obligations: sampleDashboardInput.obligations.map((obligation) => ({ ...obligation, paid: true }))
    });
    const snapshot = calculateDashboardSnapshot(input);

    expect(snapshot.unpaidObligations).toBe(0);
    expect(snapshot.realAvailableMoney).toBe(35851 + 17899);
  });

  it("increases real available money when an obligation changes from unpaid to paid", () => {
    const unpaid = calculateDashboardSnapshot(testInput());
    const input = testInput({
      obligations: sampleDashboardInput.obligations.map((obligation) =>
        obligation.id === "phone" ? { ...obligation, paid: true } : obligation
      )
    });
    const paid = calculateDashboardSnapshot(input);

    expect(paid.realAvailableMoney).toBe(unpaid.realAvailableMoney + 699);
  });

  it("tracks credit card expense as card liability without reducing cash immediately", () => {
    const baseline = calculateDashboardSnapshot(testInput());
    const input = testInput({
      creditCardStatements: sampleDashboardInput.creditCardStatements.map((statement) =>
        statement.id === "card-1-statement"
          ? { ...statement, currentCycleSpending: statement.currentCycleSpending + 12345 }
          : statement
      )
    });
    const snapshot = calculateDashboardSnapshot(input);

    expect(snapshot.cashLikeBalance).toBe(baseline.cashLikeBalance);
    expect(snapshot.currentCardCycleSpending).toBe(baseline.currentCardCycleSpending + 12345);
    expect(snapshot.realAvailableMoney).toBe(baseline.realAvailableMoney);
  });

  it("reduces cash and remaining card payable when a credit card payment is made", () => {
    const baseline = calculateDashboardSnapshot(testInput());
    const paymentAmount = 1000;
    const input = testInput({
      accounts: sampleDashboardInput.accounts.map((account) =>
        account.id === "main-bank" ? { ...account, balance: account.balance - paymentAmount } : account
      ),
      creditCardStatements: sampleDashboardInput.creditCardStatements.map((statement) =>
        statement.id === "card-1-statement"
          ? { ...statement, paidAmount: statement.paidAmount + paymentAmount }
          : statement
      )
    });
    const snapshot = calculateDashboardSnapshot(input);

    expect(snapshot.cashLikeBalance).toBe(baseline.cashLikeBalance - paymentAmount);
    expect(snapshot.remainingCreditCardPayable).toBe(baseline.remainingCreditCardPayable - paymentAmount);
    expect(snapshot.realAvailableMoney).toBe(baseline.realAvailableMoney);
  });

  it("does not count transfers between cash-like accounts as expenses", () => {
    const baseline = calculateDashboardSnapshot(testInput());
    const transferAmount = 4000;
    const input = testInput({
      accounts: sampleDashboardInput.accounts.map((account) => {
        if (account.id === "main-bank") {
          return { ...account, balance: account.balance - transferAmount };
        }

        if (account.id === "other-bank") {
          return { ...account, balance: account.balance + transferAmount };
        }

        return account;
      })
    });
    const snapshot = calculateDashboardSnapshot(input);

    expect(snapshot.cashLikeBalance).toBe(baseline.cashLikeBalance);
    expect(snapshot.realAvailableMoney).toBe(baseline.realAvailableMoney);
  });

  it("tracks investment transfers separately from normal expenses", () => {
    const baseline = calculateDashboardSnapshot(testInput());
    const input = testInput({
      investmentTransfersThisCycle: baseline.investmentTransfersThisCycle + 25000
    });
    const snapshot = calculateDashboardSnapshot(input);

    expect(snapshot.investmentTransfersThisCycle).toBe(baseline.investmentTransfersThisCycle + 25000);
    expect(snapshot.realAvailableMoney).toBe(baseline.realAvailableMoney);
  });

  it("reduces real available money for monthly sinking fund reserves only while unreserved", () => {
    const baseline = calculateDashboardSnapshot(testInput());
    const input = testInput({
      sinkingFundReserves: sampleDashboardInput.sinkingFundReserves.map((fund) => ({
        ...fund,
        reservedThisCycle: true
      }))
    });
    const snapshot = calculateDashboardSnapshot(input);

    expect(baseline.monthlySinkingFundReserves).toBe(2850);
    expect(snapshot.monthlySinkingFundReserves).toBe(0);
    expect(snapshot.realAvailableMoney).toBe(baseline.realAvailableMoney + 2850);
  });
});

describe("financial cycle rules", () => {
  it("runs the financial cycle from the 25th to the 24th", () => {
    const beforeBoundary = getFinancialCycle(new Date(2026, 7, 24, 9));
    const afterBoundary = getFinancialCycle(new Date(2026, 7, 25, 9));

    expect(beforeBoundary.start).toEqual(new Date(2026, 6, 25, 12));
    expect(beforeBoundary.end).toEqual(new Date(2026, 7, 24, 12));
    expect(afterBoundary.start).toEqual(new Date(2026, 7, 25, 12));
    expect(afterBoundary.end).toEqual(new Date(2026, 8, 24, 12));
  });

  it("assigns early weekend salary payments to the cycle starting on the 25th", () => {
    const saturdayCycleStart = getCycleStartForSalaryPayment(new Date(2026, 6, 24, 9));
    const sundayCycleStart = getCycleStartForSalaryPayment(new Date(2026, 9, 23, 9));

    expect(saturdayCycleStart).toEqual(new Date(2026, 6, 25, 12));
    expect(sundayCycleStart).toEqual(new Date(2026, 9, 25, 12));
  });
});


describe("Supabase dashboard row mapping", () => {
  const cycleStart = new Date(2026, 6, 25, 12);
  const cycleEnd = new Date(2026, 7, 24, 12);

  function rows(overrides: Partial<DashboardRows> = {}): DashboardRows {
    return {
      accounts: [],
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

  it("maps Supabase rows into the dashboard input without mixing investment transfers with expenses", () => {
    const input = mapDashboardRowsToInput(
      rows({
        accounts: [
          { id: "main", name: "Main", type: "main_bank", balance: "50000", active: true },
          { id: "invest", name: "Invest", type: "investment", balance: "25000", active: true }
        ],
        transactions: [
          { id: "income", account_id: "main", category_id: null, type: "income", amount: "90000", transaction_date: "2026-07-25", cycle_start_date: "2026-07-25", related_entity_id: null },
          { id: "expense", account_id: "main", category_id: "daily", type: "expense", amount: "4000", transaction_date: "2026-07-26", cycle_start_date: "2026-07-25", related_entity_id: null },
          { id: "invest-transfer", account_id: "main", category_id: null, type: "investment_transfer", amount: "10000", transaction_date: "2026-07-27", cycle_start_date: "2026-07-25", related_entity_id: null }
        ],
        budgets: [{ id: "budget", category_id: "daily", label: "Daily", amount: "12000", cycle_start_date: "2026-07-25", active: true }]
      }),
      cycleStart,
      cycleEnd
    );
    const snapshot = calculateDashboardSnapshot(input);

    expect(snapshot.cashLikeBalance).toBe(50000);
    expect(snapshot.investmentBalance).toBe(25000);
    expect(snapshot.cycleIncome).toBe(90000);
    expect(snapshot.investmentTransfersThisCycle).toBe(10000);
    expect(snapshot.unspentReservedBudgets).toBe(8000);
    expect(snapshot.realAvailableMoney).toBe(42000);
  });

  it("derives unpaid monthly subscriptions and yearly subscription reserves", () => {
    const input = mapDashboardRowsToInput(
      rows({
        subscriptions: [
          { id: "ai", name: "AI tools", frequency: "monthly", price: "2200", billing_day: 5, active: true },
          { id: "football", name: "Football app", frequency: "yearly", price: "4200", billing_day: 1, active: true }
        ],
        transactions: [{ id: "paid-ai", account_id: "main", category_id: null, type: "expense", amount: "2200", transaction_date: "2026-07-26", cycle_start_date: "2026-07-25", related_entity_id: "ai" }]
      }),
      cycleStart,
      cycleEnd
    );

    expect(input.obligations).toEqual([{ id: "ai", label: "AI tools", amount: 2200, paid: true, kind: "subscription" }]);
    expect(input.sinkingFundReserves).toEqual([{ id: "football", label: "Football app", monthlyReserve: 350, reservedThisCycle: false }]);
  });

  it("treats current-cycle sinking fund reserve transactions as already reserved", () => {
    const input = mapDashboardRowsToInput(
      rows({
        annualExpenses: [
          { id: "condo-fee", name: "Condo common fee", annual_amount: "12000", monthly_reserve: "1000", active: true }
        ],
        transactions: [
          { id: "reserve", account_id: null, category_id: null, type: "sinking_fund_reserve", amount: "1000", transaction_date: "2026-07-26", cycle_start_date: "2026-07-25", related_entity_id: "condo-fee" }
        ]
      }),
      cycleStart,
      cycleEnd
    );
    const snapshot = calculateDashboardSnapshot(input);

    expect(input.sinkingFundReserves).toEqual([{ id: "condo-fee", label: "Condo common fee", monthlyReserve: 1000, reservedThisCycle: true }]);
    expect(snapshot.monthlySinkingFundReserves).toBe(0);
  });

  it("keeps annual expenses reserved until a matching sinking fund transaction exists", () => {
    const input = mapDashboardRowsToInput(
      rows({
        annualExpenses: [
          { id: "condo-insurance", name: "Condo insurance", annual_amount: "6000", monthly_reserve: "500", active: true }
        ]
      }),
      cycleStart,
      cycleEnd
    );
    const snapshot = calculateDashboardSnapshot(input);

    expect(input.sinkingFundReserves).toEqual([{ id: "condo-insurance", label: "Condo insurance", monthlyReserve: 500, reservedThisCycle: false }]);
    expect(snapshot.monthlySinkingFundReserves).toBe(500);
  });

  it("aggregates card statements, paid amounts, and current card spending by card", () => {
    const input = mapDashboardRowsToInput(
      rows({
        creditCards: [{ id: "card", name: "Main card", active: true }],
        creditCardStatements: [
          { id: "old-paid", card_id: "card", statement_amount_due: "9999", paid_amount: "9999", remaining_payable: "0", due_date: "2026-07-10", status: "paid" },
          { id: "stmt", card_id: "card", statement_amount_due: "12000", paid_amount: "5000", remaining_payable: "7000", due_date: "2026-08-10", status: "partial" }
        ],
        cardTransactions: [{ id: "ct", card_id: "card", statement_id: null, amount: "3300", transaction_date: "2026-07-27", billing_cycle_start: "2026-07-25" }]
      }),
      cycleStart,
      cycleEnd
    );
    const snapshot = calculateDashboardSnapshot(input);

    expect(input.creditCardStatements).toEqual([{ id: "stmt", cardName: "Main card", currentCycleSpending: 3300, statementAmountDue: 12000, paidAmount: 5000 }]);
    expect(snapshot.currentCardCycleSpending).toBe(3300);
    expect(snapshot.remainingCreditCardPayable).toBe(7000);
  });

  it("reduces planned debt payment only by payments inside the current cycle", () => {
    const input = mapDashboardRowsToInput(
      rows({
        debts: [{ id: "debt", name: "Main debt", remaining_balance: "500000", monthly_payment: "9000", active: true }],
        debtPayments: [
          { id: "before", debt_id: "debt", amount: "9000", paid_date: "2026-07-20" },
          { id: "inside", debt_id: "debt", amount: "4000", paid_date: "2026-08-01" }
        ]
      }),
      cycleStart,
      cycleEnd
    );

    expect(input.plannedDebtPayments).toEqual([{ id: "debt", debtName: "Main debt", amount: 5000, paid: false }]);
  });

  it("detects whether Supabase returned real dashboard rows", () => {
    expect(hasRealDashboardRows(rows())).toBe(false);
    expect(hasRealDashboardRows(rows({ accounts: [{ id: "main", name: "Main", type: "main_bank", balance: 1, active: true }] }))).toBe(true);
  });
});


describe("transaction account balance effects", () => {
  it("reduces cash for cash/bank expenses", () => {
    expect(getAccountBalanceDeltas({ type: "expense", amount: 150, accountId: "cash" })).toEqual([{ accountId: "cash", delta: -150 }]);
  });

  it("does not reduce cash for credit card expenses", () => {
    expect(getAccountBalanceDeltas({ type: "credit_card_expense", amount: 150, accountId: "cash" })).toEqual([]);
  });

  it("moves money without creating expense for transfers", () => {
    expect(getAccountBalanceDeltas({ type: "transfer", amount: 500, accountId: "main", destinationAccountId: "wallet" })).toEqual([
      { accountId: "main", delta: -500 },
      { accountId: "wallet", delta: 500 }
    ]);
  });

  it("moves investment transfers separately from normal spending", () => {
    expect(getAccountBalanceDeltas({ type: "investment_transfer", amount: 1000, accountId: "main", destinationAccountId: "invest" })).toEqual([
      { accountId: "main", delta: -1000 },
      { accountId: "invest", delta: 1000 }
    ]);
  });

  it("keeps virtual sinking fund reserves out of account balances", () => {
    expect(getAccountBalanceDeltas({ type: "sinking_fund_reserve", amount: 1000, accountId: "main" })).toEqual([]);
  });
});

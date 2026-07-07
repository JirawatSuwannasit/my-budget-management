import { describe, expect, it } from "vitest";
import { getCycleStartForSalaryPayment, getFinancialCycle, getLastBillingCutDate, getSalaryPaymentForCycle } from "./cycle";
import { calculateDashboardSnapshot } from "./dashboard";
import { getAccountBalanceDeltas } from "./transaction-effects";
import { computeCardObligation, hasRealDashboardRows, mapDashboardRowsToInput, type DashboardRows } from "./dashboard-data";
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

  it("tracks credit card current-cycle spending as informational without reducing cash immediately", () => {
    const baseline = calculateDashboardSnapshot(testInput());
    const input = testInput({
      creditCards: sampleDashboardInput.creditCards.map((card) =>
        card.id === "card-1" ? { ...card, currentCycleSpending: card.currentCycleSpending + 12345 } : card
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
      creditCards: sampleDashboardInput.creditCards.map((card) =>
        card.id === "card-1" ? { ...card, billedOutstanding: card.billedOutstanding - paymentAmount } : card
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

  it("runs a calendar-month cycle when the start day is 1", () => {
    const onStartDay = getFinancialCycle(new Date(2026, 7, 1, 9), 1);
    const dayBefore = getFinancialCycle(new Date(2026, 6, 31, 9), 1);

    expect(onStartDay.start).toEqual(new Date(2026, 7, 1, 12));
    expect(onStartDay.end).toEqual(new Date(2026, 7, 31, 12));
    expect(dayBefore.start).toEqual(new Date(2026, 6, 1, 12));
    expect(dayBefore.end).toEqual(new Date(2026, 6, 31, 12));
  });

  it("wraps to the previous month before a start day of 15", () => {
    const beforeBoundary = getFinancialCycle(new Date(2026, 7, 14, 9), 15);
    const onBoundary = getFinancialCycle(new Date(2026, 7, 15, 9), 15);

    expect(beforeBoundary.start).toEqual(new Date(2026, 6, 15, 12));
    expect(beforeBoundary.end).toEqual(new Date(2026, 7, 14, 12));
    expect(onBoundary.start).toEqual(new Date(2026, 7, 15, 12));
    expect(onBoundary.end).toEqual(new Date(2026, 8, 14, 12));
  });

  it("shifts a weekend start day back to the prior Friday for a start day of 1", () => {
    // 1 Aug 2026 is a Saturday, so a salary for the cycle starting on the 1st is paid on Friday 31 Jul.
    const salaryPayment = getSalaryPaymentForCycle(new Date(2026, 7, 1, 12));

    expect(salaryPayment).toEqual(new Date(2026, 6, 31, 12));
  });

  it("assigns an early cross-month salary payment to the cycle starting on the 1st", () => {
    // Friday 31 Jul 2026 is the early payment for the cycle that starts Saturday 1 Aug 2026.
    const cycleStart = getCycleStartForSalaryPayment(new Date(2026, 6, 31, 9), 1);

    expect(cycleStart).toEqual(new Date(2026, 7, 1, 12));
  });
});

describe("getLastBillingCutDate", () => {
  it("returns this month's cut when today is mid-month, well after the cut", () => {
    expect(getLastBillingCutDate(new Date(2026, 7, 20, 9), 15)).toEqual(new Date(2026, 7, 15, 12));
  });

  it("returns last month's cut when today is before this month's cut day", () => {
    expect(getLastBillingCutDate(new Date(2026, 7, 10, 9), 15)).toEqual(new Date(2026, 6, 15, 12));
  });

  it("treats the cut day itself as already billed (uses this month's cut)", () => {
    expect(getLastBillingCutDate(new Date(2026, 7, 15, 9), 15)).toEqual(new Date(2026, 7, 15, 12));
  });

  it("clamps a cut day of 31 to a short month's last day", () => {
    // February 2026 has 28 days. Before the clamped 28th, still in January's cut.
    expect(getLastBillingCutDate(new Date(2026, 1, 20, 9), 31)).toEqual(new Date(2026, 0, 31, 12));
    // On (or after) the clamped 28th, February's own (clamped) cut applies.
    expect(getLastBillingCutDate(new Date(2026, 1, 28, 9), 31)).toEqual(new Date(2026, 1, 28, 12));
  });
});

describe("computeCardObligation", () => {
  const billingCutDay = 25;
  const today = new Date(2026, 7, 10, 9); // Aug 10 2026; last cut is Jul 25.

  it("splits card transactions into billed (on/before the cut) and current-cycle (after the cut)", () => {
    const obligation = computeCardObligation(
      {
        billingCutDay,
        cardTransactions: [
          { amount: "5000", transaction_date: "2026-07-20" }, // billed
          { amount: "1200", transaction_date: "2026-07-25" }, // billed (on the cut day)
          { amount: "800", transaction_date: "2026-07-26" } // current cycle
        ],
        cardPayments: []
      },
      today
    );

    expect(obligation.billedSpend).toBe(6200);
    expect(obligation.currentCycleSpending).toBe(800);
    expect(obligation.billedOutstanding).toBe(6200);
  });

  it("pays down the billed balance first and never goes negative", () => {
    const obligation = computeCardObligation(
      {
        billingCutDay,
        cardTransactions: [{ amount: "10000", transaction_date: "2026-07-20" }],
        cardPayments: [{ amount: "4000" }, { amount: "7000" }]
      },
      today
    );

    expect(obligation.totalPaid).toBe(11000);
    expect(obligation.billedOutstanding).toBe(0);
  });
});

describe("Supabase dashboard row mapping", () => {
  const cycleStart = new Date(2026, 6, 25, 12);
  const cycleEnd = new Date(2026, 7, 24, 12);

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
      cardPayments: [],
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

  it("ignores dashboard records linked to inactive categories", () => {
    const input = mapDashboardRowsToInput(
      rows({
        categories: [
          { id: "active-daily", active: true },
          { id: "inactive-shopping", active: false }
        ],
        transactions: [
          { id: "active-expense", account_id: "main", category_id: "active-daily", type: "expense", amount: "1000", transaction_date: "2026-07-26", cycle_start_date: "2026-07-25", related_entity_id: null },
          { id: "inactive-expense", account_id: "main", category_id: "inactive-shopping", type: "expense", amount: "9000", transaction_date: "2026-07-26", cycle_start_date: "2026-07-25", related_entity_id: null }
        ],
        budgets: [
          { id: "active-budget", category_id: "active-daily", label: "Daily", amount: "5000", cycle_start_date: "2026-07-25", active: true },
          { id: "inactive-budget", category_id: "inactive-shopping", label: "Shopping", amount: "50000", cycle_start_date: "2026-07-25", active: true }
        ],
        subscriptions: [
          { id: "inactive-sub", name: "Old sub", frequency: "monthly", price: "9999", billing_day: 1, active: true, category_id: "inactive-shopping" }
        ],
        annualExpenses: [
          { id: "inactive-annual", name: "Old annual", annual_amount: "12000", monthly_reserve: "1000", active: true, category_id: "inactive-shopping" }
        ]
      }),
      cycleStart,
      cycleEnd
    );

    expect(input.reservedBudgets).toEqual([{ id: "active-budget", label: "Daily", budgetAmount: 5000, usedAmount: 1000 }]);
    expect(input.obligations).toEqual([]);
    expect(input.sinkingFundReserves).toEqual([]);
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

  it("derives billed vs. current-cycle card spending and pays down the billed balance first", () => {
    const today = new Date(2026, 7, 10, 9); // Aug 10 2026; the card cuts on the 25th, so the last cut is Jul 25.
    const input = mapDashboardRowsToInput(
      rows({
        creditCards: [{ id: "card", name: "Main card", billing_cut_day: 25, payment_due_day: 5, active: true }],
        cardTransactions: [
          { id: "billed", card_id: "card", amount: "12000", transaction_date: "2026-07-20" },
          { id: "floating", card_id: "card", amount: "3300", transaction_date: "2026-07-27" }
        ],
        cardPayments: [{ id: "pay", card_id: "card", amount: "5000" }]
      }),
      cycleStart,
      cycleEnd,
      today
    );
    const snapshot = calculateDashboardSnapshot(input);

    expect(input.creditCards).toEqual([{ id: "card", cardName: "Main card", billedOutstanding: 7000, currentCycleSpending: 3300 }]);
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

  it("excludes card-linked installments from planned debt payments (their obligation is the card float, not a second immediate deduction)", () => {
    const input = mapDashboardRowsToInput(
      rows({
        debts: [
          { id: "installment", name: "Phone installment", type: "installment", card_id: "card-1", remaining_balance: "396", monthly_payment: "396", active: true },
          { id: "loan", name: "Personal loan", type: "personal_loan", remaining_balance: "500000", monthly_payment: "9000", active: true }
        ]
      }),
      cycleStart,
      cycleEnd
    );

    expect(input.plannedDebtPayments).toEqual([{ id: "loan", debtName: "Personal loan", amount: 9000, paid: false }]);
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

  it("moves no cash for a debt payment with no account (the card-linked installment auto-paydown)", () => {
    expect(getAccountBalanceDeltas({ type: "debt_payment", amount: 396, accountId: null })).toEqual([]);
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

  it("moves money from source to reserve account for sinking fund reserves", () => {
    expect(getAccountBalanceDeltas({ type: "sinking_fund_reserve", amount: 1000, accountId: "main", destinationAccountId: "reserve" })).toEqual([
      { accountId: "main", delta: -1000 },
      { accountId: "reserve", delta: 1000 }
    ]);
  });
});

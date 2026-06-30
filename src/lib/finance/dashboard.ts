import type { Account, DashboardInput, DashboardSnapshot } from "./types";
import { isCashLikeType } from "./types";

export function isCashLikeAccount(account: Account) {
  return isCashLikeType(account.type);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function calculateDashboardSnapshot(input: DashboardInput): DashboardSnapshot {
  const cashLikeBalance = sum(input.accounts.filter(isCashLikeAccount).map((account) => account.balance));
  const investmentBalance = sum(input.accounts.filter((account) => account.type === "investment").map((account) => account.balance));
  const savingsBalance = sum(input.accounts.filter((account) => account.type === "savings").map((account) => account.balance));
  const unpaidObligations = sum(input.obligations.filter((item) => !item.paid).map((item) => item.amount));
  const unspentReservedBudgets = sum(input.reservedBudgets.map((budget) => Math.max(0, budget.budgetAmount - budget.usedAmount)));
  const remainingCreditCardPayable = sum(input.creditCardStatements.map((statement) => Math.max(0, statement.statementAmountDue - statement.paidAmount)));
  const currentCardCycleSpending = sum(input.creditCardStatements.map((statement) => statement.currentCycleSpending));
  const plannedDebtPayments = sum(input.plannedDebtPayments.filter((payment) => !payment.paid).map((payment) => payment.amount));
  const monthlySinkingFundReserves = sum(input.sinkingFundReserves.filter((fund) => !fund.reservedThisCycle).map((fund) => fund.monthlyReserve));

  return {
    cashLikeBalance,
    investmentBalance,
    savingsBalance,
    unpaidObligations,
    unspentReservedBudgets,
    remainingCreditCardPayable,
    currentCardCycleSpending,
    plannedDebtPayments,
    monthlySinkingFundReserves,
    realAvailableMoney:
      cashLikeBalance -
      unpaidObligations -
      unspentReservedBudgets -
      remainingCreditCardPayable -
      plannedDebtPayments -
      monthlySinkingFundReserves,
    cycleIncome: input.cycleIncome,
    investmentTransfersThisCycle: input.investmentTransfersThisCycle,
    debtRemaining: input.debtRemaining
  };
}

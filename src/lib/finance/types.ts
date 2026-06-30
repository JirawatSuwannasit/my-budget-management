export type AccountType = "main_bank" | "other_bank" | "cash" | "wallet" | "investment" | "savings";

export const CASH_LIKE_TYPES = ["main_bank", "other_bank", "cash", "wallet"] as const;

export function isCashLikeType(type: AccountType): boolean {
  return (CASH_LIKE_TYPES as readonly string[]).includes(type);
}
export type CategoryKind = "income" | "expense" | "transfer" | "debt" | "subscription" | "sinking_fund" | "investment" | "other";

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "credit_card_expense"
  | "credit_card_payment"
  | "debt_payment"
  | "investment_transfer"
  | "sinking_fund_reserve";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
};

export type Obligation = {
  id: string;
  label: string;
  amount: number;
  paid: boolean;
  kind: "bill" | "subscription" | "family_support" | "other";
};

export type ReservedBudget = {
  id: string;
  label: string;
  budgetAmount: number;
  usedAmount: number;
};

export type CreditCardStatement = {
  id: string;
  cardName: string;
  currentCycleSpending: number;
  statementAmountDue: number;
  paidAmount: number;
};

export type PlannedDebtPayment = {
  id: string;
  debtName: string;
  amount: number;
  paid: boolean;
};

export type SinkingFundReserve = {
  id: string;
  label: string;
  monthlyReserve: number;
  reservedThisCycle: boolean;
};

export type DashboardInput = {
  accounts: Account[];
  obligations: Obligation[];
  reservedBudgets: ReservedBudget[];
  creditCardStatements: CreditCardStatement[];
  plannedDebtPayments: PlannedDebtPayment[];
  sinkingFundReserves: SinkingFundReserve[];
  cycleIncome: number;
  investmentTransfersThisCycle: number;
  debtRemaining: number;
};

export type DashboardSnapshot = {
  cashLikeBalance: number;
  investmentBalance: number;
  savingsBalance: number;
  unpaidObligations: number;
  unspentReservedBudgets: number;
  remainingCreditCardPayable: number;
  currentCardCycleSpending: number;
  plannedDebtPayments: number;
  monthlySinkingFundReserves: number;
  realAvailableMoney: number;
  cycleIncome: number;
  investmentTransfersThisCycle: number;
  debtRemaining: number;
};

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account, DashboardInput } from "./types";

export type DashboardDataSource = "supabase" | "demo";

export type DashboardLoadResult =
  | { status: "ready"; source: DashboardDataSource; input: DashboardInput; notices: string[] }
  | { status: "empty"; source: "demo"; input: DashboardInput; notices: string[] }
  | { status: "error"; source: "demo"; input: DashboardInput; error: string; notices: string[] };

type AccountRow = {
  id: string;
  name: string;
  type: Account["type"];
  balance: number | string | null;
  active: boolean | null;
};

type TransactionRow = {
  id: string;
  account_id: string | null;
  category_id: string | null;
  type: string;
  amount: number | string | null;
  transaction_date: string;
  cycle_start_date: string;
  related_entity_id: string | null;
};

type CategoryRow = {
  id: string;
  active: boolean | null;
};

type BudgetRow = {
  id: string;
  category_id: string | null;
  label: string;
  amount: number | string | null;
  cycle_start_date: string;
  active: boolean | null;
};

type SubscriptionRow = {
  id: string;
  category_id?: string | null;
  name: string;
  frequency: "monthly" | "yearly";
  price: number | string | null;
  billing_day: number;
  active: boolean | null;
};

type AnnualExpenseRow = {
  id: string;
  category_id?: string | null;
  name: string;
  annual_amount: number | string | null;
  monthly_reserve: number | string | null;
  due_date?: string | null;
  active: boolean | null;
};

type DebtRow = {
  id: string;
  name: string;
  remaining_balance: number | string | null;
  monthly_payment: number | string | null;
  active: boolean | null;
};

type DebtPaymentRow = {
  id: string;
  debt_id: string;
  amount: number | string | null;
  paid_date: string;
};

type CreditCardStatementRow = {
  id: string;
  card_id: string;
  statement_amount_due: number | string | null;
  paid_amount: number | string | null;
  remaining_payable: number | string | null;
  due_date: string;
  status: "unpaid" | "partial" | "paid";
};

type CardTransactionRow = {
  id: string;
  card_id: string;
  statement_id: string | null;
  amount: number | string | null;
  transaction_date: string;
  billing_cycle_start: string;
};

type CreditCardRow = {
  id: string;
  name: string;
  active: boolean | null;
};

export type DashboardRows = {
  accounts: AccountRow[];
  categories: CategoryRow[];
  transactions: TransactionRow[];
  budgets: BudgetRow[];
  subscriptions: SubscriptionRow[];
  annualExpenses: AnnualExpenseRow[];
  debts: DebtRow[];
  debtPayments: DebtPaymentRow[];
  creditCards: CreditCardRow[];
  creditCardStatements: CreditCardStatementRow[];
  cardTransactions: CardTransactionRow[];
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function active<T extends { active: boolean | null }>(row: T) {
  return row.active !== false;
}

function cycleDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isPaidInCycle(transactions: TransactionRow[], relatedEntityId: string, cycleStartDate: string) {
  return transactions.some((transaction) => transaction.related_entity_id === relatedEntityId && transaction.cycle_start_date === cycleStartDate);
}

export function mapDashboardRowsToInput(rows: DashboardRows, cycleStart: Date, cycleEnd?: Date): DashboardInput {
  const cycleStartDate = cycleDate(cycleStart);
  const cycleEndDate = cycleDate(cycleEnd ?? new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24, 12));
  const hasCategoryRows = rows.categories.length > 0;
  const activeCategoryIds = new Set(rows.categories.filter(active).map((category) => category.id));
  const categoryActiveOrMissing = (categoryId: string | null) => !categoryId || !hasCategoryRows || activeCategoryIds.has(categoryId);
  const cycleTransactions = rows.transactions.filter((transaction) => transaction.cycle_start_date === cycleStartDate).filter((transaction) => categoryActiveOrMissing(transaction.category_id));
  const cashExpenseTransactions = cycleTransactions.filter((transaction) => transaction.type === "expense");
  const debtPaymentsThisCycle = rows.debtPayments.filter((payment) => {
    const paidDate = cycleDate(new Date(payment.paid_date));
    return paidDate >= cycleStartDate && paidDate <= cycleEndDate;
  });
  const activeCards = rows.creditCards.filter(active);
  const cardNameById = new Map(activeCards.map((card) => [card.id, card.name]));

  const accounts = rows.accounts.filter(active).map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    balance: toNumber(account.balance)
  }));

  const monthlySubscriptionObligations = rows.subscriptions
    .filter(active)
    .filter((subscription) => categoryActiveOrMissing(subscription.category_id ?? null))
    .filter((subscription) => subscription.frequency === "monthly")
    .map((subscription) => ({
      id: subscription.id,
      label: subscription.name,
      amount: toNumber(subscription.price),
      paid: isPaidInCycle(cycleTransactions, subscription.id, cycleStartDate),
      kind: "subscription" as const
    }));

  const reservedBudgets = rows.budgets
    .filter(active)
    .filter((budget) => categoryActiveOrMissing(budget.category_id))
    .filter((budget) => budget.cycle_start_date === cycleStartDate)
    .map((budget) => {
      const usedAmount = cashExpenseTransactions
        .filter((transaction) => transaction.category_id && transaction.category_id === budget.category_id)
        .reduce((total, transaction) => total + toNumber(transaction.amount), 0);

      return {
        id: budget.id,
        label: budget.label,
        budgetAmount: toNumber(budget.amount),
        usedAmount
      };
    });

  const yearlySubscriptionReserves = rows.subscriptions
    .filter(active)
    .filter((subscription) => categoryActiveOrMissing(subscription.category_id ?? null))
    .filter((subscription) => subscription.frequency === "yearly")
    .map((subscription) => ({
      id: subscription.id,
      label: subscription.name,
      monthlyReserve: toNumber(subscription.price) / 12,
      reservedThisCycle: isPaidInCycle(cycleTransactions, subscription.id, cycleStartDate)
    }));

  const annualExpenseReserves = rows.annualExpenses
    .filter(active)
    .filter((expense) => categoryActiveOrMissing(expense.category_id ?? null))
    .map((expense) => ({
      id: expense.id,
      label: expense.name,
      monthlyReserve: toNumber(expense.monthly_reserve) || toNumber(expense.annual_amount) / 12,
      reservedThisCycle: isPaidInCycle(cycleTransactions, expense.id, cycleStartDate)
    }));

  const plannedDebtPayments = rows.debts
    .filter(active)
    .map((debt) => ({
      id: debt.id,
      debtName: debt.name,
      amount: Math.max(0, toNumber(debt.monthly_payment) - debtPaymentsThisCycle.filter((payment) => payment.debt_id === debt.id).reduce((total, payment) => total + toNumber(payment.amount), 0)),
      paid: toNumber(debt.monthly_payment) > 0 && debtPaymentsThisCycle.filter((payment) => payment.debt_id === debt.id).reduce((total, payment) => total + toNumber(payment.amount), 0) >= toNumber(debt.monthly_payment)
    }));

  const currentSpendingByCard = rows.cardTransactions
    .filter((transaction) => transaction.billing_cycle_start === cycleStartDate)
    .reduce((map, transaction) => map.set(transaction.card_id, (map.get(transaction.card_id) ?? 0) + toNumber(transaction.amount)), new Map<string, number>());

  const payableStatements = rows.creditCardStatements.filter((statement) => statement.status !== "paid" || toNumber(statement.remaining_payable) > 0);
  const statementTotalsByCard = payableStatements.reduce((map, statement) => {
    const existing = map.get(statement.card_id) ?? { statementAmountDue: 0, paidAmount: 0, statementIds: [] as string[] };
    existing.statementAmountDue += toNumber(statement.statement_amount_due);
    existing.paidAmount += toNumber(statement.paid_amount);
    existing.statementIds.push(statement.id);
    map.set(statement.card_id, existing);
    return map;
  }, new Map<string, { statementAmountDue: number; paidAmount: number; statementIds: string[] }>());

  const cardIds = new Set([...activeCards.map((card) => card.id), ...currentSpendingByCard.keys(), ...statementTotalsByCard.keys()]);
  const creditCardStatements = [...cardIds].map((cardId) => {
    const totals = statementTotalsByCard.get(cardId) ?? { statementAmountDue: 0, paidAmount: 0, statementIds: [] };
    return {
      id: totals.statementIds[0] ?? cardId,
      cardName: cardNameById.get(cardId) ?? "Credit card",
      currentCycleSpending: currentSpendingByCard.get(cardId) ?? 0,
      statementAmountDue: totals.statementAmountDue,
      paidAmount: totals.paidAmount
    };
  });

  const cycleIncome = cycleTransactions.filter((transaction) => transaction.type === "income").reduce((total, transaction) => total + toNumber(transaction.amount), 0);
  const investmentTransfersThisCycle = cycleTransactions.filter((transaction) => transaction.type === "investment_transfer").reduce((total, transaction) => total + toNumber(transaction.amount), 0);
  const debtRemaining = rows.debts.filter(active).reduce((total, debt) => total + toNumber(debt.remaining_balance), 0);

  return {
    accounts,
    obligations: monthlySubscriptionObligations,
    reservedBudgets,
    creditCardStatements,
    plannedDebtPayments,
    sinkingFundReserves: [...annualExpenseReserves, ...yearlySubscriptionReserves],
    cycleIncome,
    investmentTransfersThisCycle,
    debtRemaining
  };
}

export function hasRealDashboardRows(rows: DashboardRows) {
  return rows.accounts.length > 0 || rows.transactions.length > 0 || rows.budgets.length > 0 || rows.subscriptions.length > 0 || rows.annualExpenses.length > 0 || rows.debts.length > 0 || rows.creditCards.length > 0 || rows.creditCardStatements.length > 0 || rows.cardTransactions.length > 0;
}

async function selectTable<T>(supabase: SupabaseClient, table: string, columns = "*") {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export async function loadDashboardRows(supabase: SupabaseClient): Promise<DashboardRows> {
  const [accounts, categories, transactions, budgets, subscriptions, annualExpenses, debts, debtPayments, creditCards, creditCardStatements, cardTransactions] = await Promise.all([
    selectTable<AccountRow>(supabase, "accounts"),
    selectTable<CategoryRow>(supabase, "categories", "id,active"),
    selectTable<TransactionRow>(supabase, "transactions"),
    selectTable<BudgetRow>(supabase, "budgets"),
    selectTable<SubscriptionRow>(supabase, "subscriptions"),
    selectTable<AnnualExpenseRow>(supabase, "annual_expenses"),
    selectTable<DebtRow>(supabase, "debts"),
    selectTable<DebtPaymentRow>(supabase, "debt_payments"),
    selectTable<CreditCardRow>(supabase, "credit_cards"),
    selectTable<CreditCardStatementRow>(supabase, "credit_card_statements"),
    selectTable<CardTransactionRow>(supabase, "card_transactions")
  ]);

  return { accounts, categories, transactions, budgets, subscriptions, annualExpenses, debts, debtPayments, creditCards, creditCardStatements, cardTransactions };
}

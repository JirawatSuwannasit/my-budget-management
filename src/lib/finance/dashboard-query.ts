import "server-only";

import { hasRealDashboardRows, type DashboardRows } from "./dashboard-data";
import { createClient } from "@/lib/supabase/server";

export async function loadDashboardFeatureRows(userId: string, cycleStart: string, cycleEnd: string): Promise<{ rows: DashboardRows; hasRows: boolean }> {
  const supabase = await createClient();
  const results = await Promise.all([
    supabase.from("accounts").select("id,name,type,balance,active,low_balance_threshold").eq("user_id", userId),
    supabase.from("categories").select("id,active").eq("user_id", userId),
    supabase.from("transactions").select("id,account_id,category_id,type,amount,transaction_date,cycle_start_date,related_entity_id").eq("user_id", userId).eq("cycle_start_date", cycleStart),
    supabase.from("budgets").select("id,category_id,label,amount,cycle_start_date,active").eq("user_id", userId).eq("cycle_start_date", cycleStart),
    supabase.from("subscriptions").select("id,category_id,name,frequency,price,billing_day,active,source_account_id,source_card_id").eq("user_id", userId),
    supabase.from("annual_expenses").select("id,category_id,name,annual_amount,monthly_reserve,due_date,active").eq("user_id", userId),
    supabase.from("debts").select("id,name,type,card_id,remaining_balance,monthly_payment,active").eq("user_id", userId),
    supabase.from("debt_payments").select("id,debt_id,amount,paid_date").eq("user_id", userId).gte("paid_date", cycleStart).lte("paid_date", cycleEnd),
    supabase.from("credit_cards").select("id,name,billing_cut_day,payment_due_day,active").eq("user_id", userId),
    supabase.from("card_payments").select("id,card_id,amount").eq("user_id", userId),
    supabase.from("card_transactions").select("id,card_id,amount,transaction_date").eq("user_id", userId),
    supabase.from("transactions").select("id").eq("user_id", userId).limit(1),
    supabase.from("budgets").select("id").eq("user_id", userId).limit(1)
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
  const [accounts, categories, transactions, budgets, subscriptions, annualExpenses, debts, debtPayments, creditCards, cardPayments, cardTransactions, anyTransactions, anyBudgets] = results;
  const rows = { accounts: accounts.data ?? [], categories: categories.data ?? [], transactions: transactions.data ?? [], budgets: budgets.data ?? [], subscriptions: subscriptions.data ?? [], annualExpenses: annualExpenses.data ?? [], debts: debts.data ?? [], debtPayments: debtPayments.data ?? [], creditCards: creditCards.data ?? [], cardPayments: cardPayments.data ?? [], cardTransactions: cardTransactions.data ?? [] } as DashboardRows;
  const hasRows = hasRealDashboardRows(rows) || (anyTransactions.data?.length ?? 0) > 0 || (anyBudgets.data?.length ?? 0) > 0;
  return { rows, hasRows };
}

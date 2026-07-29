import "server-only";

import type { DashboardRows } from "./dashboard-data";
import type { ReportCategory } from "./reports";
import { createClient } from "@/lib/supabase/server";

export async function loadReportsFeatureRows(userId: string): Promise<{ rows: DashboardRows; categories: ReportCategory[]; hasRows: boolean }> {
  const supabase = await createClient();
  const [transactions, debts, debtPayments, categories, accounts, budgets, subscriptions, annualExpenses, creditCards, cardPayments, cardTransactions] = await Promise.all([
    supabase.from("transactions").select("id,account_id,category_id,type,amount,transaction_date,cycle_start_date,related_entity_id").eq("user_id", userId),
    supabase.from("debts").select("id,name,type,card_id,remaining_balance,monthly_payment,active").eq("user_id", userId),
    supabase.from("debt_payments").select("id,debt_id,amount,paid_date").eq("user_id", userId),
    supabase.from("categories").select("id,name,active").eq("user_id", userId),
    supabase.from("accounts").select("id").eq("user_id", userId).limit(1),
    supabase.from("budgets").select("id").eq("user_id", userId).limit(1),
    supabase.from("subscriptions").select("id").eq("user_id", userId).limit(1),
    supabase.from("annual_expenses").select("id").eq("user_id", userId).limit(1),
    supabase.from("credit_cards").select("id").eq("user_id", userId).limit(1),
    supabase.from("card_payments").select("id").eq("user_id", userId).limit(1),
    supabase.from("card_transactions").select("id").eq("user_id", userId).limit(1)
  ]);
  const results = [transactions, debts, debtPayments, categories, accounts, budgets, subscriptions, annualExpenses, creditCards, cardPayments, cardTransactions];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
  const rows = {
    accounts: [], categories: [], transactions: transactions.data ?? [], budgets: [], subscriptions: [], annualExpenses: [],
    debts: debts.data ?? [], debtPayments: debtPayments.data ?? [], creditCards: [], cardPayments: [], cardTransactions: []
  } as DashboardRows;
  const hasRows = results.some((result, index) => index !== 3 && (result.data?.length ?? 0) > 0);
  return { rows, categories: (categories.data ?? []) as ReportCategory[], hasRows };
}

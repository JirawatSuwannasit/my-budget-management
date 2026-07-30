import "server-only";

import { cache } from "react";
import type { DashboardRows } from "./dashboard-data";
import { buildUpcomingItems, emptyUpcomingSummary } from "./upcoming";
import { getPrivateCycleContext } from "@/lib/server/private-context";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const loadUpcomingSummaryForRequest = cache(async (userId: string, asOfDate: string) => {
  try {
    const { supabase, cycle, today } = await getPrivateCycleContext(asOfDate);
    const start = dateKey(cycle.start);
    const end = dateKey(cycle.end);
    const [accounts, transactions, subscriptions, annualExpenses, debts, debtPayments, creditCards, cardPayments, cardTransactions] = await Promise.all([
      supabase.from("accounts").select("id,name,type,balance,active,low_balance_threshold").eq("user_id", userId).eq("active", true),
      supabase.from("transactions").select("id,account_id,category_id,type,amount,transaction_date,cycle_start_date,related_entity_id").eq("user_id", userId).eq("cycle_start_date", start),
      supabase.from("subscriptions").select("id,name,frequency,price,billing_day,active,source_card_id").eq("user_id", userId).eq("active", true),
      supabase.from("annual_expenses").select("id,name,annual_amount,monthly_reserve,due_date,active").eq("user_id", userId).eq("active", true),
      supabase.from("debts").select("id,name,type,card_id,remaining_balance,monthly_payment,active").eq("user_id", userId).eq("active", true),
      supabase.from("debt_payments").select("id,debt_id,amount,paid_date").eq("user_id", userId).gte("paid_date", start).lte("paid_date", end),
      supabase.from("credit_cards").select("id,name,billing_cut_day,payment_due_day,active").eq("user_id", userId).eq("active", true),
      supabase.from("card_payments").select("id,card_id,amount").eq("user_id", userId),
      supabase.from("card_transactions").select("id,card_id,amount,transaction_date").eq("user_id", userId)
    ]);
    const results = [accounts, transactions, subscriptions, annualExpenses, debts, debtPayments, creditCards, cardPayments, cardTransactions];
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new Error(failed.error.message);
    const rows: DashboardRows = {
      accounts: accounts.data ?? [], categories: [], transactions: transactions.data ?? [], budgets: [],
      subscriptions: subscriptions.data ?? [], annualExpenses: annualExpenses.data ?? [], debts: debts.data ?? [],
      debtPayments: debtPayments.data ?? [], creditCards: creditCards.data ?? [], cardPayments: cardPayments.data ?? [],
      cardTransactions: cardTransactions.data ?? []
    };
    return buildUpcomingItems({ rows, cycleStart: cycle.start, cycleEnd: cycle.end, today });
  } catch {
    return emptyUpcomingSummary();
  }
});

import Link from "next/link";
import { ListChecks } from "lucide-react";
import { DeleteTransactionForm } from "@/components/transactions/delete-transaction-form";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { LazyDetails } from "@/components/ui/lazy-details";
import { createClient } from "@/lib/supabase/server";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import type { AccountType, CategoryKind, TransactionType } from "@/lib/finance/types";

const RECENT_PAGE_SIZE = 25;
const RECENT_MAX = 500;

type AccountRow = { id: string; name: string; type: AccountType; active: boolean };
type CategoryRow = { id: string; name: string; kind: CategoryKind; active: boolean };
type DebtRow = { id: string; name: string; active: boolean };
type CardRow = { id: string; name: string; active: boolean };
type AnnualExpenseRow = { id: string; name: string; active: boolean };
type SubscriptionRow = { id: string; name: string; frequency: "monthly" | "yearly"; active: boolean };
type TransactionRow = { id: string; account_id: string | null; destination_account_id: string | null; category_id: string | null; type: TransactionType; amount: number | string; transaction_date: string; cycle_start_date: string; related_entity_id: string | null; notes: string | null; created_at: string };

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(value));
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ recent?: string }> }) {
  const { recent } = await searchParams;
  const parsedRecent = Number(recent);
  const recentLimit = Number.isInteger(parsedRecent) && parsedRecent > RECENT_PAGE_SIZE ? Math.min(parsedRecent, RECENT_MAX) : RECENT_PAGE_SIZE;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle() : { data: null };
  const locale = isLocale(profile?.locale) ? profile.locale : "th";
  const t = dictionaries[locale].transactions;

  const [accountsResult, categoriesResult, debtsResult, cardsResult, annualResult, subscriptionsResult, transactionsResult, appSettingsResult] = await Promise.all([
    supabase.from("accounts").select("id,name,type,active").order("active", { ascending: false }).order("name"),
    supabase.from("categories").select("id,name,kind,active").order("name"),
    supabase.from("debts").select("id,name,active").order("active", { ascending: false }).order("name"),
    supabase.from("credit_cards").select("id,name,active").order("active", { ascending: false }).order("name"),
    supabase.from("annual_expenses").select("id,name,active").order("name"),
    supabase.from("subscriptions").select("id,name,frequency,active").order("name"),
    supabase.from("transactions").select("id,account_id,destination_account_id,category_id,type,amount,transaction_date,cycle_start_date,related_entity_id,notes,created_at").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(recentLimit),
    user ? supabase.from("app_settings").select("default_account_id").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null })
  ]);

  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const debts = (debtsResult.data ?? []) as DebtRow[];
  const cards = (cardsResult.data ?? []) as CardRow[];
  const annualExpenses = (annualResult.data ?? []) as AnnualExpenseRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const transactions = (transactionsResult.data ?? []) as TransactionRow[];
  const reserves = [
    ...annualExpenses.filter((item) => item.active).map((item) => ({ id: item.id, label: item.name, kind: "annual" as const })),
    ...subscriptions.filter((item) => item.active && item.frequency === "yearly").map((item) => ({ id: item.id, label: item.name, kind: "subscription" as const }))
  ];
  const payables = [
    ...subscriptions.filter((item) => item.active && item.frequency === "monthly").map((item) => ({ id: item.id, label: item.name + " - " + dictionaries[locale].upcoming.types.subscription, kind: "monthly_subscription" as const })),
    ...subscriptions.filter((item) => item.active && item.frequency === "yearly").map((item) => ({ id: item.id, label: item.name + " - " + dictionaries[locale].planning.yearly, kind: "yearly_subscription" as const })),
    ...annualExpenses.filter((item) => item.active).map((item) => ({ id: item.id, label: item.name + " - " + dictionaries[locale].planning.form.annualExpense, kind: "annual_expense" as const }))
  ];
  const accountName = new Map(accounts.map((account) => [account.id, account.name]));
  const defaultAccountId = (appSettingsResult.data as { default_account_id: string | null } | null)?.default_account_id ?? null;
  const loadError = accountsResult.error ?? categoriesResult.error ?? debtsResult.error ?? cardsResult.error ?? annualResult.error ?? subscriptionsResult.error ?? transactionsResult.error;

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-elevated via-surface to-surface p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">{t.eyebrow}</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">{t.subtitle}</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-canvas shadow-card"><ListChecks size={22} aria-hidden="true" /></div>
        </div>
      </section>

      {loadError ? <p className="rounded-panel border border-danger/30 bg-danger/10 p-4 text-sm font-bold text-danger">{t.loadError}: {loadError.message}</p> : null}
      {accounts.length === 0 ? <p className="rounded-panel border border-warning/30 bg-warning/10 p-4 text-sm font-bold text-warning">{t.needAccount}</p> : null}

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <h2 className="mb-3 text-xl font-black text-ink">{t.addTransaction}</h2>
          <TransactionForm accounts={accounts} categories={categories} debts={debts} cards={cards} reserves={reserves} payables={payables} defaultAccountId={defaultAccountId} locale={locale} />
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink">{t.recent}</h2>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-black text-muted shadow-card">{t.recentPrefix} {transactions.length}</span>
          </div>
          {transactions.length === 0 ? <p className="rounded-panel border border-dashed border-line bg-surface/80 p-5 text-sm font-bold text-muted">{t.empty}</p> : null}
          {transactions.map((transaction) => (
            <article key={transaction.id} className="rounded-panel border border-line bg-surface p-4 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{t.types[transaction.type]}</span>
                    <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-black text-muted">{transaction.transaction_date}</span>
                  </div>
                  <p className="mt-2 text-2xl font-black text-ink">{formatMoney(transaction.amount)}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">{transaction.account_id ? accountName.get(transaction.account_id) ?? t.accountFallback : t.noCashAccount}{transaction.destination_account_id ? " -> " + (accountName.get(transaction.destination_account_id) ?? t.destinationFallback) : ""}</p>
                  {transaction.notes ? <p className="mt-2 text-sm font-semibold text-muted">{transaction.notes}</p> : null}
                </div>
                <DeleteTransactionForm id={transaction.id} locale={locale} />
              </div>
              <LazyDetails className="mt-4" summaryClassName="cursor-pointer text-sm font-black text-primary" summary={t.editTransaction}>
                <div className="mt-3"><TransactionForm accounts={accounts} categories={categories} debts={debts} cards={cards} reserves={reserves} payables={payables} transaction={transaction} defaultAccountId={defaultAccountId} locale={locale} compact /></div>
              </LazyDetails>
            </article>
          ))}
          {transactions.length === recentLimit && recentLimit < RECENT_MAX ? (
            <Link href={`/transactions?recent=${recentLimit + RECENT_PAGE_SIZE}`} className="rounded-panel border border-line bg-surface p-4 text-center text-sm font-black text-primary shadow-card transition hover:border-primary/40">
              {t.showMore}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}

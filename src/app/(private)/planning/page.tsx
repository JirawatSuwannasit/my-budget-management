import { Banknote, CalendarClock, PiggyBank, Repeat, WalletCards } from "lucide-react";
import { AnnualExpenseForm } from "@/components/planning/annual-expense-form";
import { BudgetForm } from "@/components/planning/budget-form";
import { PayAnnualBillForm, PaySubscriptionForm, ReserveAnnualExpenseForm, ReserveSubscriptionForm } from "@/components/planning/payment-workflow-forms";
import { SubscriptionForm } from "@/components/planning/subscription-form";
import { getFinancialCycle, getUserCycleStartDay } from "@/lib/finance/cycle";
import type { CategoryKind } from "@/lib/finance/types";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { setAnnualExpenseActive, setBudgetActive, setSubscriptionActive } from "./actions";

type BudgetRow = { id: string; category_id: string | null; label: string; amount: number | string; cycle_start_date: string; active: boolean };
type SubscriptionRow = { id: string; category_id: string | null; name: string; frequency: "monthly" | "yearly"; price: number | string; billing_day: number; payment_method: string | null; active: boolean };
type AnnualExpenseRow = { id: string; category_id: string | null; name: string; annual_amount: number | string; monthly_reserve: number | string | null; due_date: string | null; reserve_account_id: string | null; active: boolean };
type CategoryRow = { id: string; name: string; kind: CategoryKind; active: boolean };
type TransactionRow = { id: string; category_id: string | null; type: string; amount: number | string; cycle_start_date: string; related_entity_id: string | null };
type AccountRow = { id: string; name: string; type: string; active: boolean };
type CardRow = { id: string; name: string; active: boolean };

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(toNumber(value));
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function ProgressBar({ percent, warning = false }: { percent: number; warning?: boolean }) {
  const capped = Math.max(0, Math.min(100, percent));
  const color = warning ? "bg-rose-500" : percent >= 85 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
      <div className={"h-full rounded-full " + color} style={{ width: capped + "%" }} />
    </div>
  );
}

function StatusPill({ active, locale }: { active: boolean; locale: Locale }) {
  const common = dictionaries[locale].common;
  return <span className={"rounded-full px-2.5 py-1 text-xs font-black " + (active ? "bg-income/10 text-income" : "bg-elevated text-muted")}>{active ? common.active : common.inactive}</span>;
}

function ToggleActiveForm({ id, active, action, locale }: { id: string; active: boolean; action: (formData: FormData) => void | Promise<void>; locale: Locale }) {
  const common = dictionaries[locale].common;
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">{active ? common.deactivate : common.activate}</button>
    </form>
  );
}

export default async function PlanningPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const startDay = user ? await getUserCycleStartDay(supabase, user.id) : undefined;
  const cycle = getFinancialCycle(new Date(), startDay);
  const cycleStartDate = toDateInput(cycle.start);
  const [profileResult, accountsResult, budgetsResult, subscriptionsResult, annualResult, categoriesResult, transactionsResult, cardsResult, appSettingsResult] = await Promise.all([
    user ? supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("accounts").select("id,name,type,active").order("active", { ascending: false }).order("name"),
    supabase.from("budgets").select("id,category_id,label,amount,cycle_start_date,active").eq("cycle_start_date", cycleStartDate).order("active", { ascending: false }).order("label"),
    supabase.from("subscriptions").select("id,category_id,name,frequency,price,billing_day,payment_method,active").order("active", { ascending: false }).order("name"),
    supabase.from("annual_expenses").select("id,category_id,name,annual_amount,monthly_reserve,due_date,reserve_account_id,active").order("active", { ascending: false }).order("name"),
    supabase.from("categories").select("id,name,kind,active").order("name"),
    supabase.from("transactions").select("id,category_id,type,amount,cycle_start_date,related_entity_id").eq("cycle_start_date", cycleStartDate),
    supabase.from("credit_cards").select("id,name,active").order("active", { ascending: false }).order("name"),
    user ? supabase.from("app_settings").select("default_account_id").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null })
  ]);

  const locale = isLocale(profileResult.data?.locale) ? profileResult.data.locale : "th";
  const t = dictionaries[locale].planning;
  const common = dictionaries[locale].common;
  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const budgets = (budgetsResult.data ?? []) as BudgetRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const annualExpenses = (annualResult.data ?? []) as AnnualExpenseRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const transactions = (transactionsResult.data ?? []) as TransactionRow[];
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]));
  const defaultAccountId = (appSettingsResult.data as { default_account_id: string | null } | null)?.default_account_id ?? null;
  const loadError = profileResult.error ?? accountsResult.error ?? budgetsResult.error ?? subscriptionsResult.error ?? annualResult.error ?? categoriesResult.error ?? transactionsResult.error ?? cardsResult.error;
  const expenseTransactions = transactions.filter((transaction) => transaction.type === "expense");
  const reserveTransactions = transactions.filter((transaction) => transaction.type === "sinking_fund_reserve");
  const cashLikeAccounts = accounts.filter((account) => account.active && account.type !== "investment");
  const activeCards = ((cardsResult.data ?? []) as CardRow[]).filter((card) => card.active).map((card) => ({ id: card.id, name: card.name }));
  const linkedThisCycle = (id: string) => transactions.some((transaction) => transaction.related_entity_id === id);
  const paidThisCycle = (id: string) => expenseTransactions.some((transaction) => transaction.related_entity_id === id);
  const reservedThisCycle = (id: string) => reserveTransactions.some((transaction) => transaction.related_entity_id === id);

  const budgetCards = budgets.map((budget) => {
    const used = expenseTransactions
      .filter((transaction) => transaction.category_id && transaction.category_id === budget.category_id)
      .reduce((total, transaction) => total + toNumber(transaction.amount), 0);
    const amount = toNumber(budget.amount);
    const remaining = amount - used;
    const percent = amount <= 0 ? 0 : Math.round((used / amount) * 100);
    const dailyAvailable = Math.max(0, remaining) / Math.max(1, cycle.daysRemaining);
    return { ...budget, used, amount, remaining, percent, dailyAvailable, categoryName: budget.category_id ? categoryNameById.get(budget.category_id) ?? common.expenseCategory : common.noCategory };
  });

  const monthlySubscriptions = subscriptions.filter((subscription) => subscription.frequency === "monthly");
  const yearlySubscriptions = subscriptions.filter((subscription) => subscription.frequency === "yearly");
  const monthlySubscriptionTotal = monthlySubscriptions.filter((subscription) => subscription.active).filter((subscription) => !paidThisCycle(subscription.id)).reduce((total, subscription) => total + toNumber(subscription.price), 0);
  const yearlyReserveTotal = yearlySubscriptions
    .filter((subscription) => subscription.active)
    .filter((subscription) => !linkedThisCycle(subscription.id))
    .reduce((total, subscription) => total + toNumber(subscription.price) / 12, 0);
  const annualReserveTotal = annualExpenses
    .filter((expense) => expense.active)
    .filter((expense) => !linkedThisCycle(expense.id))
    .reduce((total, expense) => total + (toNumber(expense.monthly_reserve) || toNumber(expense.annual_amount) / 12), 0);

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-elevated via-surface to-surface p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">{t.phase}</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">{t.subtitle}</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-canvas shadow-card"><WalletCards size={22} aria-hidden="true" /></div>
        </div>
      </section>

      {loadError ? <p className="rounded-panel border border-danger/30 bg-danger/10 p-4 text-sm font-bold text-danger">{t.loadError}: {loadError.message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-panel border border-line bg-surface p-4 shadow-card">
          <p className="text-xs font-black uppercase tracking-normal text-muted">{t.totalBudgetRemaining}</p>
          <p className="mt-3 text-3xl font-black text-ink">{formatMoney(budgetCards.reduce((total, budget) => total + Math.max(0, budget.remaining), 0))}</p>
        </div>
        <div className="rounded-panel border border-warning/30 bg-warning/10 p-4 text-warning shadow-card">
          <p className="text-xs font-black uppercase tracking-normal opacity-70">{t.monthlySubscriptions}</p>
          <p className="mt-3 text-3xl font-black">{formatMoney(monthlySubscriptionTotal)}</p>
        </div>
        <div className="rounded-panel border border-income/20 bg-income/10 p-4 text-income shadow-card">
          <p className="text-xs font-black uppercase tracking-normal opacity-70">{t.monthlySinkingReserve}</p>
          <p className="mt-3 text-3xl font-black">{formatMoney(yearlyReserveTotal + annualReserveTotal)}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Banknote className="text-primary" size={20} aria-hidden="true" />
            <h2 className="text-xl font-black text-ink">{t.addMonthlyBudget}</h2>
          </div>
          <BudgetForm cycleStartDate={cycleStartDate} locale={locale} />
          <p className="mt-3 rounded-2xl border border-line bg-surface/80 p-4 text-sm font-bold text-muted">{t.budgetCycleHelpPrefix}: {cycle.label}. {t.budgetCycleHelpSuffix}</p>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink">{t.budgetProgress}</h2>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-black text-muted shadow-card">{budgetCards.length} {t.budgetsSuffix}</span>
          </div>
          {budgetCards.length === 0 ? <p className="rounded-panel border border-dashed border-line bg-surface/80 p-5 text-sm font-bold text-muted">{t.noBudgets}</p> : null}
          {budgetCards.map((budget) => (
            <article key={budget.id} className={"rounded-panel border p-4 shadow-card " + (budget.remaining < 0 ? "border-danger/30 bg-danger/10" : "border-line bg-surface")}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-ink">{budget.label}</h3>
                    <StatusPill active={budget.active} locale={locale} />
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{budget.categoryName}</span>
                    {budget.remaining < 0 ? <span className="rounded-full bg-danger/15 px-2.5 py-1 text-xs font-black text-danger">{t.overBudget}</span> : null}
                  </div>
                  <div className="mt-4 grid gap-3">
                    <ProgressBar percent={budget.percent} warning={budget.remaining < 0} />
                    <div className="grid gap-2 text-sm font-bold text-muted sm:grid-cols-4">
                      <span>{t.budget} {formatMoney(budget.amount)}</span>
                      <span>{t.used} {formatMoney(budget.used)}</span>
                      <span>{t.remaining} {formatMoney(budget.remaining)}</span>
                      <span>{t.dailyAverage} {formatMoney(budget.dailyAvailable)}</span>
                    </div>
                  </div>
                </div>
                <ToggleActiveForm id={budget.id} active={budget.active} action={setBudgetActive} locale={locale} />
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-black text-primary">{t.editBudget}</summary>
                <div className="mt-3"><BudgetForm budget={{ ...budget, category_name: budget.categoryName }} cycleStartDate={cycleStartDate} compact locale={locale} /></div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Repeat className="text-primary" size={20} aria-hidden="true" />
            <h2 className="text-xl font-black text-ink">{t.addSubscription}</h2>
          </div>
          <SubscriptionForm locale={locale} />
        </div>

        <div className="grid gap-3">
          <h2 className="text-xl font-black text-ink">{t.subscriptions}</h2>
          {subscriptions.length === 0 ? <p className="rounded-panel border border-dashed border-line bg-surface/80 p-5 text-sm font-bold text-muted">{t.noSubscriptions}</p> : null}
          {subscriptions.map((subscription) => {
            const categoryName = subscription.category_id ? categoryNameById.get(subscription.category_id) ?? common.other : common.other;
            const reserveMonthly = subscription.frequency === "yearly" ? toNumber(subscription.price) / 12 : 0;
            const isReserved = reservedThisCycle(subscription.id);
            const isPaid = paidThisCycle(subscription.id);
            const paidOrReserved = isReserved || isPaid;
            return (
              <article key={subscription.id} className="rounded-panel border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-ink">{subscription.name}</h3>
                      <StatusPill active={subscription.active} locale={locale} />
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{categoryName}</span>
                      <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-black text-muted">{subscription.frequency === "monthly" ? t.monthly : t.yearly}</span>
                    </div>
                    <p className="mt-3 text-2xl font-black text-ink">{formatMoney(subscription.price)}</p>
                    <p className="mt-1 text-sm font-semibold text-muted">{subscription.frequency === "monthly" ? t.monthlyFixedObligation : t.yearlySinkingFundReserve + " " + formatMoney(reserveMonthly) + "/" + t.monthly} · {t.billingDay} {subscription.billing_day}</p>
                    {paidOrReserved ? <p className="mt-2 text-sm font-black text-income">{isPaid ? t.paidThisCycle : t.reservedThisCycle}</p> : null}
                  </div>
                  <ToggleActiveForm id={subscription.id} active={subscription.active} action={setSubscriptionActive} locale={locale} />
                </div>
                {subscription.active ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {subscription.frequency === "yearly" ? <ReserveSubscriptionForm subscriptionId={subscription.id} amount={reserveMonthly} locale={locale} /> : null}
                    <PaySubscriptionForm subscriptionId={subscription.id} categoryId={subscription.category_id} amount={toNumber(subscription.price)} accounts={cashLikeAccounts} creditCards={activeCards} defaultAccountId={defaultAccountId} frequency={subscription.frequency} locale={locale} />
                  </div>
                ) : null}
                {subscription.active && cashLikeAccounts.length === 0 ? <p className="mt-3 rounded-2xl bg-warning/10 p-3 text-sm font-bold text-warning">{t.addCashLikeAccountSubscription}</p> : null}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-black text-primary">{t.editSubscription}</summary>
                  <div className="mt-3"><SubscriptionForm subscription={{ ...subscription, category_name: categoryName }} compact locale={locale} /></div>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <PiggyBank className="text-primary" size={20} aria-hidden="true" />
            <h2 className="text-xl font-black text-ink">{t.addSinkingFund}</h2>
          </div>
          <AnnualExpenseForm accounts={cashLikeAccounts} locale={locale} />
        </div>

        <div className="grid gap-3">
          <h2 className="text-xl font-black text-ink">{t.annualExpenses}</h2>
          {annualExpenses.length === 0 ? <p className="rounded-panel border border-dashed border-line bg-surface/80 p-5 text-sm font-bold text-muted">{t.noAnnualExpenses}</p> : null}
          {annualExpenses.map((expense) => {
            const categoryName = expense.category_id ? categoryNameById.get(expense.category_id) ?? common.other : common.other;
            const monthlyReserve = toNumber(expense.monthly_reserve) || toNumber(expense.annual_amount) / 12;
            const reserved = reservedThisCycle(expense.id);
            const paid = paidThisCycle(expense.id);
            const completedThisCycle = reserved || paid;
            return (
              <article key={expense.id} className="rounded-panel border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-ink">{expense.name}</h3>
                      <StatusPill active={expense.active} locale={locale} />
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{categoryName}</span>
                      {completedThisCycle ? <span className="rounded-full bg-income/10 px-2.5 py-1 text-xs font-black text-income">{paid ? common.paid : common.reserved}</span> : null}
                    </div>
                    <div className="mt-4 grid gap-3">
                      <ProgressBar percent={completedThisCycle ? 100 : 0} />
                      <div className="grid gap-2 text-sm font-bold text-muted sm:grid-cols-3">
                        <span>{t.annual} {formatMoney(expense.annual_amount)}</span>
                        <span>{t.monthlyReserve} {formatMoney(monthlyReserve)}</span>
                        <span>{expense.due_date ? t.due + " " + expense.due_date : t.noDueDate}</span>
                      </div>
                    </div>
                  </div>
                  <ToggleActiveForm id={expense.id} active={expense.active} action={setAnnualExpenseActive} locale={locale} />
                </div>
                {expense.active ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <ReserveAnnualExpenseForm annualExpenseId={expense.id} amount={monthlyReserve} accounts={cashLikeAccounts} defaultAccountId={defaultAccountId} reserveAccountId={expense.reserve_account_id} reserveAccountName={expense.reserve_account_id ? accountNameById.get(expense.reserve_account_id) ?? null : null} locale={locale} />
                    <PayAnnualBillForm annualExpenseId={expense.id} categoryId={expense.category_id} amount={toNumber(expense.annual_amount)} accounts={cashLikeAccounts} defaultAccountId={defaultAccountId} reserveAccountId={expense.reserve_account_id} reserveAccountName={expense.reserve_account_id ? accountNameById.get(expense.reserve_account_id) ?? null : null} locale={locale} />
                  </div>
                ) : null}
                {expense.active && cashLikeAccounts.length === 0 ? <p className="mt-3 rounded-2xl bg-warning/10 p-3 text-sm font-bold text-warning">{t.addCashLikeAccountAnnual}</p> : null}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-black text-primary">{t.editSinkingFund}</summary>
                  <div className="mt-3"><AnnualExpenseForm annualExpense={{ ...expense, category_name: categoryName }} accounts={cashLikeAccounts} compact locale={locale} /></div>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-panel border border-line bg-surface p-5 text-sm font-semibold text-muted shadow-card">
        <div className="mb-2 flex items-center gap-2 text-ink">
          <CalendarClock size={18} className="text-primary" aria-hidden="true" />
          <h2 className="text-lg font-black">{t.dashboardLogic}</h2>
        </div>
        <p>{t.dashboardLogicText}</p>
      </section>
    </div>
  );
}

import { Banknote, CreditCard, Landmark, Plus, ReceiptText, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";
import { CreditCardForm } from "@/components/debts-cards/card-form";
import { DebtForm } from "@/components/debts-cards/debt-form";
import { DeleteDebtForm } from "@/components/debts-cards/delete-debt-form";
import { CardActivityForms, CardPaymentForm, DebtPaymentForm } from "@/components/debts-cards/payment-forms";
import { LazyDetails } from "@/components/ui/lazy-details";
import { computeCardObligation } from "@/lib/finance/dashboard-data";
import { getFinancialCycle, getUserCycleStartDay } from "@/lib/finance/cycle";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";
import type { AccountType } from "@/lib/finance/types";
import { isCashLikeType } from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";
import { setCreditCardActive, setDebtActive } from "./actions";

type AccountRow = { id: string; name: string; type: string; active: boolean };
type DebtRow = {
  id: string;
  name: string;
  type: "personal_loan" | "interest_free" | "installment" | "credit_card_debt" | "other";
  original_amount: number | string;
  remaining_balance: number | string;
  interest_rate: number | string;
  monthly_payment: number | string;
  bonus_payment_amount: number | string | null;
  target_payoff_date: string | null;
  card_id: string | null;
  installment_months: number | null;
  active: boolean;
};
type DebtPaymentRow = { id: string; debt_id: string; account_id: string | null; amount: number | string; paid_date: string; source: string | null; notes: string | null; created_at: string };
type CardRow = { id: string; name: string; billing_cut_day: number; payment_due_day: number; active: boolean };
type CardTransactionRow = { id: string; card_id: string; amount: number | string; transaction_date: string; notes: string | null };
type CardPaymentRow = { id: string; card_id: string; account_id: string | null; amount: number | string; payment_date: string; created_at: string };

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

function ProgressBar({ percent, color = "bg-primary" }: { percent: number; color?: string }) {
  const capped = Math.max(0, Math.min(100, percent));
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

function ToggleActiveForm({ id, active, kind, locale }: { id: string; active: boolean; kind: "debt" | "card"; locale: Locale }) {
  const common = dictionaries[locale].common;
  return (
    <form action={kind === "debt" ? setDebtActive : setCreditCardActive}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">{active ? common.deactivate : common.activate}</button>
    </form>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-panel border border-dashed border-line bg-surface/80 p-5 text-sm font-bold text-muted">{children}</p>;
}

export default async function DebtsCardsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const startDay = user ? await getUserCycleStartDay(supabase, user.id) : undefined;
  const cycle = getFinancialCycle(new Date(), startDay);
  const cycleStartDate = toDateInput(cycle.start);
  const cycleEndDate = toDateInput(cycle.end);

  const [profileResult, accountsResult, debtsResult, debtPaymentsResult, cardsResult, cardTransactionsResult, cardPaymentsResult, appSettingsResult] = await Promise.all([
    user ? supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("accounts").select("id,name,type,active").order("active", { ascending: false }).order("name"),
    supabase.from("debts").select("id,name,type,original_amount,remaining_balance,interest_rate,monthly_payment,bonus_payment_amount,target_payoff_date,card_id,installment_months,active").order("active", { ascending: false }).order("name"),
    supabase.from("debt_payments").select("id,debt_id,account_id,amount,paid_date,source,notes,created_at").order("paid_date", { ascending: false }).limit(80),
    supabase.from("credit_cards").select("id,name,billing_cut_day,payment_due_day,active").order("active", { ascending: false }).order("name"),
    supabase.from("card_transactions").select("id,card_id,amount,transaction_date,notes").order("transaction_date", { ascending: false }).limit(120),
    supabase.from("card_payments").select("id,card_id,account_id,amount,payment_date,created_at").order("payment_date", { ascending: false }).limit(80),
    user ? supabase.from("app_settings").select("default_account_id").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null })
  ]);

  const locale = isLocale(profileResult.data?.locale) ? profileResult.data.locale : "th";
  const t = dictionaries[locale].debtsCards;
  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const debts = (debtsResult.data ?? []) as DebtRow[];
  const debtPayments = (debtPaymentsResult.data ?? []) as DebtPaymentRow[];
  const cards = (cardsResult.data ?? []) as CardRow[];
  const cardTransactions = (cardTransactionsResult.data ?? []) as CardTransactionRow[];
  const cardPayments = (cardPaymentsResult.data ?? []) as CardPaymentRow[];
  const loadError = profileResult.error ?? accountsResult.error ?? debtsResult.error ?? debtPaymentsResult.error ?? cardsResult.error ?? cardTransactionsResult.error ?? cardPaymentsResult.error;

  const activeDebts = debts.filter((debt) => debt.active);
  const genericDebts = debts.filter((debt) => debt.type !== "installment");
  const activeCards = cards.filter((card) => card.active);
  const cashLikeAccounts = accounts.filter((account) => account.active && isCashLikeType(account.type as AccountType));
  const defaultAccountId = (appSettingsResult.data as { default_account_id: string | null } | null)?.default_account_id ?? null;

  // Card obligations derived at read time (billed vs. current-cycle floating
  // spend), same math the dashboard's safe-to-spend uses. Active cards only,
  // mirroring how deactivated debts stop counting.
  const obligationByCardId = new Map(
    activeCards.map((card) => [
      card.id,
      computeCardObligation({
        billingCutDay: card.billing_cut_day,
        cardTransactions: cardTransactions.filter((transaction) => transaction.card_id === card.id),
        cardPayments: cardPayments.filter((payment) => payment.card_id === card.id)
      })
    ])
  );

  const totalDebtRemaining = activeDebts.reduce((total, debt) => total + toNumber(debt.remaining_balance), 0);
  const plannedDebtThisCycle = activeDebts.reduce((total, debt) => {
    const paidThisCycle = debtPayments
      .filter((payment) => payment.debt_id === debt.id && payment.paid_date >= cycleStartDate && payment.paid_date <= cycleEndDate)
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    return total + Math.max(0, toNumber(debt.monthly_payment) - paidThisCycle);
  }, 0);
  const currentCardSpending = [...obligationByCardId.values()].reduce((total, obligation) => total + obligation.currentCycleSpending, 0);
  const remainingCardPayable = [...obligationByCardId.values()].reduce((total, obligation) => total + obligation.billedOutstanding, 0);

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-elevated via-surface to-surface p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">{t.phase}</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">{t.subtitle}</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-canvas shadow-card"><CreditCard size={22} aria-hidden="true" /></div>
        </div>
      </section>

      {loadError ? <p className="rounded-panel border border-danger/30 bg-danger/10 p-4 text-sm font-bold text-danger">{t.loadError}: {loadError.message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-panel border border-line bg-surface p-4 shadow-card"><p className="text-xs font-black uppercase tracking-normal text-muted">{t.debtRemaining}</p><p className="mt-3 text-3xl font-black text-ink">{formatMoney(totalDebtRemaining)}</p></div>
        <div className="rounded-panel border border-income/20 bg-income/10 p-4 text-income shadow-card"><p className="text-xs font-black uppercase tracking-normal opacity-70">{t.plannedDebtLeft}</p><p className="mt-3 text-3xl font-black">{formatMoney(plannedDebtThisCycle)}</p></div>
        <div className="rounded-panel border border-warning/30 bg-warning/10 p-4 text-warning shadow-card"><p className="text-xs font-black uppercase tracking-normal opacity-70">{t.currentCardSpending}</p><p className="mt-3 text-3xl font-black">{formatMoney(currentCardSpending)}</p></div>
        <div className="rounded-panel border border-investment/30 bg-investment/10 p-4 text-investment shadow-card"><p className="text-xs font-black uppercase tracking-normal opacity-70">{t.cardPayableLeft}</p><p className="mt-3 text-3xl font-black">{formatMoney(remainingCardPayable)}</p></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="grid gap-4">
          <details className="rounded-panel border border-line bg-surface p-4 shadow-card">
            <summary className="flex cursor-pointer items-center gap-2 text-xl font-black text-ink list-none [&::-webkit-details-marker]:hidden">
              <TrendingDown className="text-primary" size={20} aria-hidden="true" />
              <span>{t.addDebt}</span>
              <Plus size={18} className="ml-auto text-primary" aria-hidden="true" />
            </summary>
            <div className="mt-4">
              <DebtForm locale={locale} />
            </div>
          </details>
          <div>
            <div className="mb-3 flex items-center gap-2"><Banknote className="text-income" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">{t.recordDebtPayment}</h2></div>
            <DebtPaymentForm debts={activeDebts} accounts={cashLikeAccounts} defaultAccountId={defaultAccountId} locale={locale} />
            {activeDebts.length === 0 || cashLikeAccounts.length === 0 ? <p className="mt-3 rounded-2xl bg-warning/10 p-4 text-sm font-bold text-warning">{t.debtPaymentRequirement}</p> : null}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-ink">{t.debtProgress}</h2><span className="rounded-full bg-surface px-3 py-1 text-xs font-black text-muted shadow-card">{genericDebts.length} {t.debtsSuffix}</span></div>
          {genericDebts.length === 0 ? <EmptyState>{t.noDebts}</EmptyState> : null}
          {genericDebts.map((debt) => {
            const original = toNumber(debt.original_amount);
            const remaining = toNumber(debt.remaining_balance);
            const monthly = toNumber(debt.monthly_payment);
            const bonus = toNumber(debt.bonus_payment_amount);
            const paid = Math.max(0, original - remaining);
            const progress = original <= 0 ? 0 : Math.round((paid / original) * 100);
            const estimatedMonthlyPower = monthly + (bonus * 2) / 12;
            const estimatedMonths = estimatedMonthlyPower > 0 ? Math.ceil(remaining / estimatedMonthlyPower) : null;
            const history = debtPayments.filter((payment) => payment.debt_id === debt.id).slice(0, 5);
            const paidThisCycle = debtPayments.filter((payment) => payment.debt_id === debt.id && payment.paid_date >= cycleStartDate && payment.paid_date <= cycleEndDate).reduce((total, payment) => total + toNumber(payment.amount), 0);
            const plannedLeft = Math.max(0, monthly - paidThisCycle);
            return (
              <article key={debt.id} className="rounded-panel border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-ink">{debt.name}</h3><StatusPill active={debt.active} locale={locale} /><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{t.debtTypes[debt.type]}</span></div>
                    <div className="mt-4 grid gap-3">
                      <ProgressBar percent={progress} color="bg-emerald-500" />
                      <div className="grid gap-2 text-sm font-bold text-muted sm:grid-cols-3">
                        <span>{t.original} {formatMoney(original)}</span><span>{t.remaining} {formatMoney(remaining)}</span><span>{t.paid} {progress}%</span><span>{t.monthly} {formatMoney(monthly)}</span><span>{t.bonus} {formatMoney(bonus)}</span><span>{t.cyclePlanLeft} {formatMoney(plannedLeft)}</span>
                      </div>
                      <p className="text-sm font-semibold text-muted">{estimatedMonths ? t.aboutMonthsRemainingPrefix + " " + estimatedMonths + " " + t.aboutMonthsRemainingSuffix : t.cannotEstimateMonths} {debt.target_payoff_date ? "- " + t.target + " " + debt.target_payoff_date : ""}</p>
                    </div>
                    <div className="mt-4 rounded-2xl bg-elevated p-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted">{t.paymentHistory}</p>
                      {history.length === 0 ? <p className="text-sm font-bold text-muted">{t.noPayments}</p> : null}
                      <div className="grid gap-2">{history.map((payment) => <p key={payment.id} className="flex items-center justify-between gap-3 text-sm font-bold text-ink"><span>{payment.paid_date}</span><span>{formatMoney(payment.amount)}</span></p>)}</div>
                    </div>
                  </div>
                  <ToggleActiveForm id={debt.id} active={debt.active} kind="debt" locale={locale} />
                </div>
                <LazyDetails className="mt-4" summaryClassName="cursor-pointer text-sm font-black text-primary" summary={t.editDebt}><div className="mt-3"><DebtForm debt={debt} compact locale={locale} /></div></LazyDetails>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="grid gap-4">
          <details className="rounded-panel border border-line bg-surface p-4 shadow-card">
            <summary className="flex cursor-pointer items-center gap-2 text-xl font-black text-ink list-none [&::-webkit-details-marker]:hidden">
              <CreditCard className="text-primary" size={20} aria-hidden="true" />
              <span>{t.addCreditCard}</span>
              <Plus size={18} className="ml-auto text-primary" aria-hidden="true" />
            </summary>
            <div className="mt-4"><CreditCardForm locale={locale} /></div>
          </details>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-ink">{t.creditCards}</h2><span className="rounded-full bg-surface px-3 py-1 text-xs font-black text-muted shadow-card">{cards.length} {t.cardsSuffix}</span></div>
          {cards.length === 0 ? <EmptyState>{t.noCards}</EmptyState> : null}
          {cards.map((card) => {
            // Every card gets its own read (not just active ones) so a deactivated
            // card's history still shows correct figures here, even though only
            // active cards feed the top summary stats / safe-to-spend.
            const obligation = computeCardObligation({
              billingCutDay: card.billing_cut_day,
              cardTransactions: cardTransactions.filter((transaction) => transaction.card_id === card.id),
              cardPayments: cardPayments.filter((payment) => payment.card_id === card.id)
            });
            const cardInstallments = debts.filter((debt) => debt.type === "installment" && debt.card_id === card.id);
            const recentCardTransactions = cardTransactions.filter((transaction) => transaction.card_id === card.id).slice(0, 5);
            const recentPayments = cardPayments.filter((payment) => payment.card_id === card.id).slice(0, 5);
            return (
              <article key={card.id} className="rounded-panel border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-ink">{card.name}</h3><StatusPill active={card.active} locale={locale} /><span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-black text-muted">{t.cutDay} {card.billing_cut_day}</span><span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-black text-muted">{t.dueDay} {card.payment_due_day}</span></div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-danger/10 p-3 text-danger"><p className="text-xs font-black opacity-70">{t.amountDue}</p><p className="mt-1 text-lg font-black">{formatMoney(obligation.billedOutstanding)}</p></div>
                      <div className="rounded-2xl bg-warning/10 p-3 text-warning"><p className="text-xs font-black opacity-70">{t.floatingThisCycle}</p><p className="mt-1 text-lg font-black">{formatMoney(obligation.currentCycleSpending)}</p></div>
                    </div>
                  </div>
                  <ToggleActiveForm id={card.id} active={card.active} kind="card" locale={locale} />
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl bg-elevated p-3">
                    <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted">{t.installmentsOnCard}</p>
                    {cardInstallments.length === 0 ? <p className="text-sm font-bold text-muted">{t.noInstallments}</p> : null}
                    <div className="grid gap-2">
                      {cardInstallments.map((installment) => (
                        <div key={installment.id} className="rounded-2xl bg-surface p-3 text-sm font-bold text-ink">
                          <div className="flex flex-wrap items-center justify-between gap-2"><span>{installment.name}</span><StatusPill active={installment.active} locale={locale} /></div>
                          <p className="mt-2 text-muted">{t.installmentMonthly} {formatMoney(installment.monthly_payment)} · {t.installmentRemaining} {formatMoney(installment.remaining_balance)}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <ToggleActiveForm id={installment.id} active={installment.active} kind="debt" locale={locale} />
                            <DeleteDebtForm id={installment.id} locale={locale} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-elevated p-3">
                    <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted">{t.recentCardActivity}</p>
                    {recentCardTransactions.length === 0 && recentPayments.length === 0 ? <p className="text-sm font-bold text-muted">{t.noCardActivity}</p> : null}
                    <div className="grid gap-2">
                      {recentCardTransactions.map((transaction) => <p key={transaction.id} className="flex items-center justify-between gap-3 text-sm font-bold text-ink"><span>{transaction.transaction_date}</span><span>{t.expense} {formatMoney(transaction.amount)}</span></p>)}
                      {recentPayments.map((payment) => <p key={payment.id} className="flex items-center justify-between gap-3 text-sm font-bold text-income"><span>{payment.payment_date}</span><span>{t.payment} {formatMoney(payment.amount)}</span></p>)}
                    </div>
                  </div>
                </div>

                <LazyDetails className="mt-4" summaryClassName="cursor-pointer text-sm font-black text-primary" summary={t.editCard}><div className="mt-3"><CreditCardForm card={card} locale={locale} /></div></LazyDetails>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <details className="rounded-panel border border-line bg-surface p-4 shadow-card">
          <summary className="flex cursor-pointer items-center gap-2 text-xl font-black text-ink list-none [&::-webkit-details-marker]:hidden">
            <CreditCard className="text-warning" size={20} aria-hidden="true" />
            <span>{t.addCreditCardExpense}</span>
            <Plus size={18} className="ml-auto text-primary" aria-hidden="true" />
          </summary>
          <div className="mt-4">
            <CardActivityForms cards={activeCards} locale={locale} />
            <p className="mt-3 rounded-2xl bg-surface p-4 text-sm font-bold text-muted shadow-card">{t.cardExpenseHelp}</p>
          </div>
        </details>
        <div>
          <div className="mb-3 flex items-center gap-2"><Landmark className="text-investment" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">{t.payCard}</h2></div>
          <CardPaymentForm cards={activeCards} accounts={cashLikeAccounts} defaultAccountId={defaultAccountId} locale={locale} />
          {activeCards.length === 0 || cashLikeAccounts.length === 0 ? <p className="mt-3 rounded-2xl bg-warning/10 p-4 text-sm font-bold text-warning">{t.cardPaymentRequirement}</p> : null}
        </div>
      </section>

      <section className="rounded-panel border border-line bg-surface p-5 text-sm font-semibold text-muted shadow-card">
        <div className="mb-2 flex items-center gap-2 text-ink"><ReceiptText size={18} className="text-primary" aria-hidden="true" /><h2 className="text-lg font-black">{t.dashboardLogic}</h2></div>
        <p>{t.dashboardLogicText}</p>
      </section>
    </div>
  );
}

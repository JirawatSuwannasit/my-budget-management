import { Banknote, CreditCard, Landmark, ReceiptText, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";
import { CreditCardForm } from "@/components/debts-cards/card-form";
import { DebtForm } from "@/components/debts-cards/debt-form";
import { CardActivityForms, CardPaymentForm, DebtPaymentForm } from "@/components/debts-cards/payment-forms";
import { CreditCardStatementForm } from "@/components/debts-cards/statement-form";
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
type StatementRow = { id: string; card_id: string; cycle_start: string; cycle_end: string; statement_amount_due: number | string; paid_amount: number | string; remaining_payable: number | string; due_date: string; status: "unpaid" | "partial" | "paid" };
type CardTransactionRow = { id: string; card_id: string; statement_id: string | null; amount: number | string; transaction_date: string; billing_cycle_start: string; notes: string | null };
type CardPaymentRow = { id: string; card_id: string; statement_id: string | null; account_id: string | null; amount: number | string; payment_date: string; created_at: string };

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

function StatementStatusPill({ status, locale }: { status: StatementRow["status"]; locale: Locale }) {
  const common = dictionaries[locale].common;
  const className = status === "paid" ? "bg-income/10 text-income" : status === "partial" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger";
  const label = status === "paid" ? common.paid : status === "partial" ? common.partial : common.unpaid;
  return <span className={"rounded-full px-2.5 py-1 text-xs font-black " + className}>{label}</span>;
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

  const [profileResult, accountsResult, debtsResult, debtPaymentsResult, cardsResult, statementsResult, cardTransactionsResult, cardPaymentsResult, appSettingsResult] = await Promise.all([
    user ? supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("accounts").select("id,name,type,active").order("active", { ascending: false }).order("name"),
    supabase.from("debts").select("id,name,type,original_amount,remaining_balance,interest_rate,monthly_payment,bonus_payment_amount,target_payoff_date,card_id,installment_months,active").order("active", { ascending: false }).order("name"),
    supabase.from("debt_payments").select("id,debt_id,account_id,amount,paid_date,source,notes,created_at").order("paid_date", { ascending: false }).limit(80),
    supabase.from("credit_cards").select("id,name,billing_cut_day,payment_due_day,active").order("active", { ascending: false }).order("name"),
    supabase.from("credit_card_statements").select("id,card_id,cycle_start,cycle_end,statement_amount_due,paid_amount,remaining_payable,due_date,status").order("due_date", { ascending: false }).limit(80),
    supabase.from("card_transactions").select("id,card_id,statement_id,amount,transaction_date,billing_cycle_start,notes").order("transaction_date", { ascending: false }).limit(120),
    supabase.from("card_payments").select("id,card_id,statement_id,account_id,amount,payment_date,created_at").order("payment_date", { ascending: false }).limit(80),
    user ? supabase.from("app_settings").select("default_account_id").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null })
  ]);

  const locale = isLocale(profileResult.data?.locale) ? profileResult.data.locale : "th";
  const t = dictionaries[locale].debtsCards;
  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const debts = (debtsResult.data ?? []) as DebtRow[];
  const debtPayments = (debtPaymentsResult.data ?? []) as DebtPaymentRow[];
  const cards = (cardsResult.data ?? []) as CardRow[];
  const statements = (statementsResult.data ?? []) as StatementRow[];
  const cardTransactions = (cardTransactionsResult.data ?? []) as CardTransactionRow[];
  const cardPayments = (cardPaymentsResult.data ?? []) as CardPaymentRow[];
  const loadError = profileResult.error ?? accountsResult.error ?? debtsResult.error ?? debtPaymentsResult.error ?? cardsResult.error ?? statementsResult.error ?? cardTransactionsResult.error ?? cardPaymentsResult.error;

  const activeDebts = debts.filter((debt) => debt.active);
  const activeCards = cards.filter((card) => card.active);
  const cashLikeAccounts = accounts.filter((account) => account.active && isCashLikeType(account.type as AccountType));
  const cardNameById = new Map(cards.map((card) => [card.id, card.name]));
  const defaultAccountId = (appSettingsResult.data as { default_account_id: string | null } | null)?.default_account_id ?? null;

  const totalDebtRemaining = activeDebts.reduce((total, debt) => total + toNumber(debt.remaining_balance), 0);
  const plannedDebtThisCycle = activeDebts.reduce((total, debt) => {
    const paidThisCycle = debtPayments
      .filter((payment) => payment.debt_id === debt.id && payment.paid_date >= cycleStartDate && payment.paid_date <= cycleEndDate)
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    return total + Math.max(0, toNumber(debt.monthly_payment) - paidThisCycle);
  }, 0);
  const currentCardSpending = cardTransactions.filter((transaction) => transaction.billing_cycle_start === cycleStartDate).reduce((total, transaction) => total + toNumber(transaction.amount), 0);
  const remainingCardPayable = statements.filter((statement) => statement.status !== "paid" || toNumber(statement.remaining_payable) > 0).reduce((total, statement) => total + toNumber(statement.remaining_payable), 0);

  const openStatementOptions = statements
    .filter((statement) => statement.status !== "paid" || toNumber(statement.remaining_payable) > 0)
    .map((statement) => ({
      id: statement.id,
      card_id: statement.card_id,
      label: (cardNameById.get(statement.card_id) ?? t.form.creditCard) + " - " + t.statementOptionRemaining + " " + formatMoney(statement.remaining_payable) + " " + t.statementOptionDue + " " + statement.due_date,
      remaining_payable: toNumber(statement.remaining_payable),
      due_date: statement.due_date,
      status: statement.status
    }));

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
          <div>
            <div className="mb-3 flex items-center gap-2"><TrendingDown className="text-primary" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">{t.addDebt}</h2></div>
            <DebtForm locale={locale} />
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2"><Banknote className="text-income" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">{t.recordDebtPayment}</h2></div>
            <DebtPaymentForm debts={activeDebts} accounts={cashLikeAccounts} defaultAccountId={defaultAccountId} locale={locale} />
            {activeDebts.length === 0 || cashLikeAccounts.length === 0 ? <p className="mt-3 rounded-2xl bg-warning/10 p-4 text-sm font-bold text-warning">{t.debtPaymentRequirement}</p> : null}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-ink">{t.debtProgress}</h2><span className="rounded-full bg-surface px-3 py-1 text-xs font-black text-muted shadow-card">{debts.length} {t.debtsSuffix}</span></div>
          {debts.length === 0 ? <EmptyState>{t.noDebts}</EmptyState> : null}
          {debts.map((debt) => {
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
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-ink">{debt.name}</h3><StatusPill active={debt.active} locale={locale} /><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{t.debtTypes[debt.type]}</span>{debt.type === "installment" ? <span className="rounded-full bg-debt/15 px-2.5 py-1 text-xs font-black text-debt">{(debt.card_id ? cardNameById.get(debt.card_id) : null) ?? t.form.creditCard}{debt.installment_months ? " · " + t.form.installmentTerm.replace("{n}", String(debt.installment_months)) : ""}</span> : null}</div>
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
                <details className="mt-4"><summary className="cursor-pointer text-sm font-black text-primary">{t.editDebt}</summary><div className="mt-3"><DebtForm debt={debt} compact locale={locale} /></div></details>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="grid gap-4">
          <div><div className="mb-3 flex items-center gap-2"><CreditCard className="text-primary" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">{t.addCreditCard}</h2></div><CreditCardForm locale={locale} /></div>
          <div><div className="mb-3 flex items-center gap-2"><ReceiptText className="text-primary" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">{t.addStatement}</h2></div><CreditCardStatementForm cards={activeCards} defaultCycleStart={cycleStartDate} defaultCycleEnd={cycleEndDate} locale={locale} /></div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-ink">{t.creditCards}</h2><span className="rounded-full bg-surface px-3 py-1 text-xs font-black text-muted shadow-card">{cards.length} {t.cardsSuffix}</span></div>
          {cards.length === 0 ? <EmptyState>{t.noCards}</EmptyState> : null}
          {cards.map((card) => {
            const cardStatements = statements.filter((statement) => statement.card_id === card.id);
            const cardOpenPayable = cardStatements.reduce((total, statement) => total + toNumber(statement.remaining_payable), 0);
            const cardPaid = cardStatements.reduce((total, statement) => total + toNumber(statement.paid_amount), 0);
            const cardDue = cardStatements.reduce((total, statement) => total + toNumber(statement.statement_amount_due), 0);
            const cardCycleSpending = cardTransactions.filter((transaction) => transaction.card_id === card.id && transaction.billing_cycle_start === cycleStartDate).reduce((total, transaction) => total + toNumber(transaction.amount), 0);
            const recentCardTransactions = cardTransactions.filter((transaction) => transaction.card_id === card.id).slice(0, 5);
            const recentPayments = cardPayments.filter((payment) => payment.card_id === card.id).slice(0, 5);
            return (
              <article key={card.id} className="rounded-panel border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-ink">{card.name}</h3><StatusPill active={card.active} locale={locale} /><span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-black text-muted">{t.cutDay} {card.billing_cut_day}</span><span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-black text-muted">{t.dueDay} {card.payment_due_day}</span></div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl bg-warning/10 p-3 text-warning"><p className="text-xs font-black opacity-70">{t.currentSpending}</p><p className="mt-1 text-lg font-black">{formatMoney(cardCycleSpending)}</p></div>
                      <div className="rounded-2xl bg-elevated p-3"><p className="text-xs font-black text-muted">{t.statementDue}</p><p className="mt-1 text-lg font-black text-ink">{formatMoney(cardDue)}</p></div>
                      <div className="rounded-2xl bg-income/10 p-3 text-income"><p className="text-xs font-black opacity-70">{t.paid}</p><p className="mt-1 text-lg font-black">{formatMoney(cardPaid)}</p></div>
                      <div className="rounded-2xl bg-investment/10 p-3 text-investment"><p className="text-xs font-black opacity-70">{t.remaining}</p><p className="mt-1 text-lg font-black">{formatMoney(cardOpenPayable)}</p></div>
                    </div>
                  </div>
                  <ToggleActiveForm id={card.id} active={card.active} kind="card" locale={locale} />
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl bg-elevated p-3">
                    <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted">{t.statements}</p>
                    {cardStatements.length === 0 ? <p className="text-sm font-bold text-muted">{t.noStatements}</p> : null}
                    <div className="grid gap-2">
                      {cardStatements.slice(0, 4).map((statement) => (
                        <div key={statement.id} className="rounded-2xl bg-surface p-3 text-sm font-bold text-ink">
                          <div className="flex flex-wrap items-center justify-between gap-2"><span>{statement.cycle_start} - {statement.cycle_end}</span><StatementStatusPill status={statement.status} locale={locale} /></div>
                          <p className="mt-2 text-muted">{t.dueLabel} {statement.due_date} - {t.remaining} {formatMoney(statement.remaining_payable)}</p>
                          <details className="mt-2"><summary className="cursor-pointer text-xs font-black text-primary">{t.editStatement}</summary><div className="mt-3"><CreditCardStatementForm cards={activeCards} statement={statement} defaultCycleStart={cycleStartDate} defaultCycleEnd={cycleEndDate} locale={locale} /></div></details>
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

                <details className="mt-4"><summary className="cursor-pointer text-sm font-black text-primary">{t.editCard}</summary><div className="mt-3"><CreditCardForm card={card} locale={locale} /></div></details>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2"><CreditCard className="text-warning" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">{t.addCreditCardExpense}</h2></div>
          <CardActivityForms cards={activeCards} locale={locale} />
          <p className="mt-3 rounded-2xl bg-surface p-4 text-sm font-bold text-muted shadow-card">{t.cardExpenseHelp}</p>
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2"><Landmark className="text-investment" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">{t.payCreditCardStatement}</h2></div>
          <CardPaymentForm statements={openStatementOptions} accounts={cashLikeAccounts} defaultAccountId={defaultAccountId} locale={locale} />
          {openStatementOptions.length === 0 ? <p className="mt-3 rounded-2xl bg-warning/10 p-4 text-sm font-bold text-warning">{t.statementPaymentRequirement}</p> : null}
        </div>
      </section>

      <section className="rounded-panel border border-line bg-surface p-5 text-sm font-semibold text-muted shadow-card">
        <div className="mb-2 flex items-center gap-2 text-ink"><ReceiptText size={18} className="text-primary" aria-hidden="true" /><h2 className="text-lg font-black">{t.dashboardLogic}</h2></div>
        <p>{t.dashboardLogicText}</p>
      </section>
    </div>
  );
}

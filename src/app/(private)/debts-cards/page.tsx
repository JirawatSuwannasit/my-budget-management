import { Banknote, CreditCard, Landmark, ReceiptText, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";
import { CreditCardForm } from "@/components/debts-cards/card-form";
import { DebtForm } from "@/components/debts-cards/debt-form";
import { CardExpenseForm, CardPaymentForm, DebtPaymentForm } from "@/components/debts-cards/payment-forms";
import { CreditCardStatementForm } from "@/components/debts-cards/statement-form";
import { getFinancialCycle } from "@/lib/finance/cycle";
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
  active: boolean;
};
type DebtPaymentRow = { id: string; debt_id: string; account_id: string | null; amount: number | string; paid_date: string; source: string | null; notes: string | null; created_at: string };
type CardRow = { id: string; name: string; billing_cut_day: number; payment_due_day: number; active: boolean };
type StatementRow = { id: string; card_id: string; cycle_start: string; cycle_end: string; statement_amount_due: number | string; paid_amount: number | string; remaining_payable: number | string; due_date: string; status: "unpaid" | "partial" | "paid" };
type CardTransactionRow = { id: string; card_id: string; statement_id: string | null; amount: number | string; transaction_date: string; billing_cycle_start: string; notes: string | null };
type CardPaymentRow = { id: string; card_id: string; statement_id: string | null; account_id: string | null; amount: number | string; payment_date: string; created_at: string };

const debtTypeLabels: Record<DebtRow["type"], string> = {
  personal_loan: "Personal loan",
  interest_free: "Interest-free debt",
  installment: "Product installment",
  credit_card_debt: "Credit card debt",
  other: "Other"
};

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
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div className={"h-full rounded-full " + color} style={{ width: capped + "%" }} />
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return <span className={"rounded-full px-2.5 py-1 text-xs font-black " + (active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-muted")}>{active ? "Active" : "Inactive"}</span>;
}

function StatementStatusPill({ status }: { status: StatementRow["status"] }) {
  const className = status === "paid" ? "bg-emerald-50 text-emerald-800" : status === "partial" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800";
  const label = status === "paid" ? "Paid" : status === "partial" ? "Partial" : "Unpaid";
  return <span className={"rounded-full px-2.5 py-1 text-xs font-black " + className}>{label}</span>;
}

function ToggleActiveForm({ id, active, kind }: { id: string; active: boolean; kind: "debt" | "card" }) {
  return (
    <form action={kind === "debt" ? setDebtActive : setCreditCardActive}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">{active ? "Deactivate" : "Activate"}</button>
    </form>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-panel border border-dashed border-slate-300 bg-white/80 p-5 text-sm font-bold text-muted">{children}</p>;
}

export default async function DebtsCardsPage() {
  const cycle = getFinancialCycle(new Date());
  const cycleStartDate = toDateInput(cycle.start);
  const cycleEndDate = toDateInput(cycle.end);
  const supabase = await createClient();

  const [accountsResult, debtsResult, debtPaymentsResult, cardsResult, statementsResult, cardTransactionsResult, cardPaymentsResult] = await Promise.all([
    supabase.from("accounts").select("id,name,type,active").order("active", { ascending: false }).order("name"),
    supabase.from("debts").select("id,name,type,original_amount,remaining_balance,interest_rate,monthly_payment,bonus_payment_amount,target_payoff_date,active").order("active", { ascending: false }).order("name"),
    supabase.from("debt_payments").select("id,debt_id,account_id,amount,paid_date,source,notes,created_at").order("paid_date", { ascending: false }).limit(80),
    supabase.from("credit_cards").select("id,name,billing_cut_day,payment_due_day,active").order("active", { ascending: false }).order("name"),
    supabase.from("credit_card_statements").select("id,card_id,cycle_start,cycle_end,statement_amount_due,paid_amount,remaining_payable,due_date,status").order("due_date", { ascending: false }).limit(80),
    supabase.from("card_transactions").select("id,card_id,statement_id,amount,transaction_date,billing_cycle_start,notes").order("transaction_date", { ascending: false }).limit(120),
    supabase.from("card_payments").select("id,card_id,statement_id,account_id,amount,payment_date,created_at").order("payment_date", { ascending: false }).limit(80)
  ]);

  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const debts = (debtsResult.data ?? []) as DebtRow[];
  const debtPayments = (debtPaymentsResult.data ?? []) as DebtPaymentRow[];
  const cards = (cardsResult.data ?? []) as CardRow[];
  const statements = (statementsResult.data ?? []) as StatementRow[];
  const cardTransactions = (cardTransactionsResult.data ?? []) as CardTransactionRow[];
  const cardPayments = (cardPaymentsResult.data ?? []) as CardPaymentRow[];
  const loadError = accountsResult.error ?? debtsResult.error ?? debtPaymentsResult.error ?? cardsResult.error ?? statementsResult.error ?? cardTransactionsResult.error ?? cardPaymentsResult.error;

  const activeDebts = debts.filter((debt) => debt.active);
  const activeCards = cards.filter((card) => card.active);
  const cashLikeAccounts = accounts.filter((account) => account.active && account.type !== "investment");
  const cardNameById = new Map(cards.map((card) => [card.id, card.name]));

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
      label: (cardNameById.get(statement.card_id) ?? "Credit card") + " - remaining " + formatMoney(statement.remaining_payable) + " due " + statement.due_date,
      remaining_payable: toNumber(statement.remaining_payable),
      due_date: statement.due_date,
      status: statement.status
    }));

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">Phase 7 debt + cards</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">Debts and credit cards</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">Manage debt payoff, card spending, statements, and payments while keeping real available money free from double counting.</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-card"><CreditCard size={22} aria-hidden="true" /></div>
        </div>
      </section>

      {loadError ? <p className="rounded-panel border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">Could not load debt/card data: {loadError.message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-card"><p className="text-xs font-black uppercase tracking-normal text-muted">Debt remaining</p><p className="mt-3 text-3xl font-black text-ink">{formatMoney(totalDebtRemaining)}</p></div>
        <div className="rounded-panel border border-emerald-100 bg-emerald-50 p-4 text-emerald-900 shadow-card"><p className="text-xs font-black uppercase tracking-normal opacity-70">Planned debt left</p><p className="mt-3 text-3xl font-black">{formatMoney(plannedDebtThisCycle)}</p></div>
        <div className="rounded-panel border border-amber-100 bg-amber-50 p-4 text-amber-900 shadow-card"><p className="text-xs font-black uppercase tracking-normal opacity-70">Current card spending</p><p className="mt-3 text-3xl font-black">{formatMoney(currentCardSpending)}</p></div>
        <div className="rounded-panel border border-blue-100 bg-blue-50 p-4 text-blue-900 shadow-card"><p className="text-xs font-black uppercase tracking-normal opacity-70">Card payable left</p><p className="mt-3 text-3xl font-black">{formatMoney(remainingCardPayable)}</p></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="grid gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2"><TrendingDown className="text-primary" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">Add debt</h2></div>
            <DebtForm />
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2"><Banknote className="text-emerald-600" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">Record debt payment</h2></div>
            <DebtPaymentForm debts={activeDebts} accounts={cashLikeAccounts} />
            {activeDebts.length === 0 || cashLikeAccounts.length === 0 ? <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">You need one active debt and one cash-like account before recording a debt payment.</p> : null}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-ink">Debt progress</h2><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted shadow-card">{debts.length} debts</span></div>
          {debts.length === 0 ? <EmptyState>No debts yet. Add the 500,000 THB interest-free example with 9,000 THB monthly payment and 50,000 THB bonus payment to start tracking payoff.</EmptyState> : null}
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
              <article key={debt.id} className="rounded-panel border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-ink">{debt.name}</h3><StatusPill active={debt.active} /><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{debtTypeLabels[debt.type]}</span></div>
                    <div className="mt-4 grid gap-3">
                      <ProgressBar percent={progress} color="bg-emerald-500" />
                      <div className="grid gap-2 text-sm font-bold text-muted sm:grid-cols-3">
                        <span>Original {formatMoney(original)}</span><span>Remaining {formatMoney(remaining)}</span><span>Paid {progress}%</span><span>Monthly {formatMoney(monthly)}</span><span>Bonus {formatMoney(bonus)}</span><span>Cycle plan left {formatMoney(plannedLeft)}</span>
                      </div>
                      <p className="text-sm font-semibold text-muted">{estimatedMonths ? "About " + estimatedMonths + " months remaining" : "Cannot estimate months remaining yet"} {debt.target_payoff_date ? "- target " + debt.target_payoff_date : ""}</p>
                    </div>
                    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted">Payment history</p>
                      {history.length === 0 ? <p className="text-sm font-bold text-muted">No payments yet.</p> : null}
                      <div className="grid gap-2">{history.map((payment) => <p key={payment.id} className="flex items-center justify-between gap-3 text-sm font-bold text-ink"><span>{payment.paid_date}</span><span>{formatMoney(payment.amount)}</span></p>)}</div>
                    </div>
                  </div>
                  <ToggleActiveForm id={debt.id} active={debt.active} kind="debt" />
                </div>
                <details className="mt-4"><summary className="cursor-pointer text-sm font-black text-primary">Edit debt</summary><div className="mt-3"><DebtForm debt={debt} compact /></div></details>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="grid gap-4">
          <div><div className="mb-3 flex items-center gap-2"><CreditCard className="text-primary" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">Add credit card</h2></div><CreditCardForm /></div>
          <div><div className="mb-3 flex items-center gap-2"><ReceiptText className="text-primary" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">Add statement</h2></div><CreditCardStatementForm cards={activeCards} defaultCycleStart={cycleStartDate} defaultCycleEnd={cycleEndDate} /></div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-ink">Credit cards</h2><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted shadow-card">{cards.length} cards</span></div>
          {cards.length === 0 ? <EmptyState>No credit cards yet. Add a card first, then add expenses and statements.</EmptyState> : null}
          {cards.map((card) => {
            const cardStatements = statements.filter((statement) => statement.card_id === card.id);
            const cardOpenPayable = cardStatements.reduce((total, statement) => total + toNumber(statement.remaining_payable), 0);
            const cardPaid = cardStatements.reduce((total, statement) => total + toNumber(statement.paid_amount), 0);
            const cardDue = cardStatements.reduce((total, statement) => total + toNumber(statement.statement_amount_due), 0);
            const cardCycleSpending = cardTransactions.filter((transaction) => transaction.card_id === card.id && transaction.billing_cycle_start === cycleStartDate).reduce((total, transaction) => total + toNumber(transaction.amount), 0);
            const recentCardTransactions = cardTransactions.filter((transaction) => transaction.card_id === card.id).slice(0, 5);
            const recentPayments = cardPayments.filter((payment) => payment.card_id === card.id).slice(0, 5);
            return (
              <article key={card.id} className="rounded-panel border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-ink">{card.name}</h3><StatusPill active={card.active} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-muted">Cut day {card.billing_cut_day}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-muted">Due day {card.payment_due_day}</span></div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl bg-amber-50 p-3 text-amber-900"><p className="text-xs font-black opacity-70">Current spending</p><p className="mt-1 text-lg font-black">{formatMoney(cardCycleSpending)}</p></div>
                      <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-black text-muted">Statement due</p><p className="mt-1 text-lg font-black text-ink">{formatMoney(cardDue)}</p></div>
                      <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-900"><p className="text-xs font-black opacity-70">Paid</p><p className="mt-1 text-lg font-black">{formatMoney(cardPaid)}</p></div>
                      <div className="rounded-2xl bg-blue-50 p-3 text-blue-900"><p className="text-xs font-black opacity-70">Remaining</p><p className="mt-1 text-lg font-black">{formatMoney(cardOpenPayable)}</p></div>
                    </div>
                  </div>
                  <ToggleActiveForm id={card.id} active={card.active} kind="card" />
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted">Statements</p>
                    {cardStatements.length === 0 ? <p className="text-sm font-bold text-muted">No statements yet.</p> : null}
                    <div className="grid gap-2">
                      {cardStatements.slice(0, 4).map((statement) => (
                        <div key={statement.id} className="rounded-2xl bg-white p-3 text-sm font-bold text-ink">
                          <div className="flex flex-wrap items-center justify-between gap-2"><span>{statement.cycle_start} - {statement.cycle_end}</span><StatementStatusPill status={statement.status} /></div>
                          <p className="mt-2 text-muted">Due {statement.due_date} - remaining {formatMoney(statement.remaining_payable)}</p>
                          <details className="mt-2"><summary className="cursor-pointer text-xs font-black text-primary">Edit statement</summary><div className="mt-3"><CreditCardStatementForm cards={activeCards} statement={statement} defaultCycleStart={cycleStartDate} defaultCycleEnd={cycleEndDate} /></div></details>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted">Recent card activity</p>
                    {recentCardTransactions.length === 0 && recentPayments.length === 0 ? <p className="text-sm font-bold text-muted">No card activity yet.</p> : null}
                    <div className="grid gap-2">
                      {recentCardTransactions.map((transaction) => <p key={transaction.id} className="flex items-center justify-between gap-3 text-sm font-bold text-ink"><span>{transaction.transaction_date}</span><span>Expense {formatMoney(transaction.amount)}</span></p>)}
                      {recentPayments.map((payment) => <p key={payment.id} className="flex items-center justify-between gap-3 text-sm font-bold text-emerald-800"><span>{payment.payment_date}</span><span>Payment {formatMoney(payment.amount)}</span></p>)}
                    </div>
                  </div>
                </div>

                <details className="mt-4"><summary className="cursor-pointer text-sm font-black text-primary">Edit card</summary><div className="mt-3"><CreditCardForm card={card} /></div></details>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2"><CreditCard className="text-amber-600" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">Add credit card expense</h2></div>
          <CardExpenseForm cards={activeCards} />
          <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-bold text-muted shadow-card">Credit card expense increases card liability and current cycle spending. It does not reduce cash until a card payment is recorded.</p>
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2"><Landmark className="text-blue-600" size={20} aria-hidden="true" /><h2 className="text-xl font-black text-ink">Pay credit card statement</h2></div>
          <CardPaymentForm statements={openStatementOptions} accounts={cashLikeAccounts} />
          {openStatementOptions.length === 0 ? <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">You need an unpaid or partial statement before recording a card payment.</p> : null}
        </div>
      </section>

      <section className="rounded-panel border border-slate-200 bg-white p-5 text-sm font-semibold text-muted shadow-card">
        <div className="mb-2 flex items-center gap-2 text-ink"><ReceiptText size={18} className="text-primary" aria-hidden="true" /><h2 className="text-lg font-black">Dashboard logic</h2></div>
        <p>The dashboard subtracts only remaining planned debt payment and remaining card payable. Payments that already reduced cash are not reserved again in real available money.</p>
      </section>
    </div>
  );
}

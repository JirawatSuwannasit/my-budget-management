"use client";

import { useActionState } from "react";
import { saveTransaction, type TransactionActionState } from "@/app/(private)/transactions/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type AccountOption = { id: string; name: string; type: string; active?: boolean };
export type DebtOption = { id: string; name: string; monthly_payment?: number | string; remaining_balance?: number | string; active?: boolean };
export type CardOption = { id: string; name: string; active?: boolean };
export type StatementOption = { id: string; card_id: string; label: string; remaining_payable: number; due_date: string; status: string };

const initialState: TransactionActionState = { status: "idle", message: "" };

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function ResultMessage({ state }: { state: TransactionActionState }) {
  if (!state.message) return null;
  return <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}>{state.message}</p>;
}

function AccountSelect({ accounts, defaultAccountId, locale }: { accounts: AccountOption[]; defaultAccountId?: string | null; locale: Locale }) {
  const t = dictionaries[locale].debtsCards.form;
  // Pre-select the user's default account when it is one of the available (active cash-like) accounts.
  const preferredAccountId = defaultAccountId && accounts.some((account) => account.id === defaultAccountId) ? defaultAccountId : accounts[0]?.id ?? "";
  return (
    <label className="grid gap-2 text-sm font-black text-ink">
      {t.payFromAccount}
      <select name="account_id" required defaultValue={preferredAccountId} className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60">
        <option value="" disabled>{t.chooseAccount}</option>
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select>
    </label>
  );
}

export function DebtPaymentForm({ debts, accounts, defaultAccountId, locale }: { debts: DebtOption[]; accounts: AccountOption[]; defaultAccountId?: string | null; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);
  const t = dictionaries[locale].debtsCards.form;
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-income/20 bg-income/10 p-4 shadow-card">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="type" value="debt_payment" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.debt}
          <select name="debt_id" required defaultValue={debts[0]?.id ?? ""} className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60">
            <option value="" disabled>{t.chooseDebt}</option>
            {debts.map((debt) => <option key={debt.id} value={debt.id}>{debt.name}</option>)}
          </select>
        </label>
        <AccountSelect accounts={accounts} defaultAccountId={defaultAccountId} locale={locale} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.amount}
          <input name="amount" type="number" min="0.01" step="0.01" required className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.paymentDate}
          <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
      </div>
      <input type="hidden" name="notes" value="Debt payment from debts and cards page" />
      <button disabled={isPending || debts.length === 0 || accounts.length === 0} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : t.recordDebtPayment}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

export function CardExpenseForm({ cards, locale }: { cards: CardOption[]; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);
  const t = dictionaries[locale].debtsCards.form;
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-warning/30 bg-warning/10 p-4 shadow-card">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="type" value="credit_card_expense" />
      <label className="grid gap-2 text-sm font-black text-ink">
        {t.creditCard}
        <select name="credit_card_id" required defaultValue={cards[0]?.id ?? ""} className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60">
          <option value="" disabled>{t.chooseCard}</option>
          {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.amount}
          <input name="amount" type="number" min="0.01" step="0.01" required className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.expenseDate}
          <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-black text-ink">
        {t.notes}
        <input name="notes" placeholder={t.notesPlaceholder} className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
      </label>
      <button disabled={isPending || cards.length === 0} className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : t.addCardExpense}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

export function CardPaymentForm({ statements, accounts, defaultAccountId, locale }: { statements: StatementOption[]; accounts: AccountOption[]; defaultAccountId?: string | null; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);
  const t = dictionaries[locale].debtsCards.form;
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-investment/30 bg-investment/10 p-4 shadow-card">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="type" value="credit_card_payment" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.statement}
          <select name="statement_id" required defaultValue={statements[0]?.id ?? ""} className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60">
            <option value="" disabled>{t.chooseStatement}</option>
            {statements.map((statement) => <option key={statement.id} value={statement.id}>{statement.label}</option>)}
          </select>
        </label>
        <AccountSelect accounts={accounts} defaultAccountId={defaultAccountId} locale={locale} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.amount}
          <input name="amount" type="number" min="0.01" step="0.01" required className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.paymentDate}
          <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
      </div>
      <input type="hidden" name="notes" value="Credit card payment from debts and cards page" />
      <button disabled={isPending || statements.length === 0 || accounts.length === 0} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : t.payStatement}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

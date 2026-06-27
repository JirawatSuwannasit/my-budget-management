"use client";

import { useActionState } from "react";
import { saveTransaction, type TransactionActionState } from "@/app/(private)/transactions/actions";

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
  return <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p>;
}

function AccountSelect({ accounts }: { accounts: AccountOption[] }) {
  return (
    <label className="grid gap-2 text-sm font-black text-ink">
      Pay from account
      <select name="account_id" required defaultValue={accounts[0]?.id ?? ""} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60">
        <option value="" disabled>Choose account</option>
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select>
    </label>
  );
}

export function DebtPaymentForm({ debts, accounts }: { debts: DebtOption[]; accounts: AccountOption[] }) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-emerald-100 bg-emerald-50/70 p-4 shadow-card">
      <input type="hidden" name="type" value="debt_payment" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          Debt
          <select name="debt_id" required defaultValue={debts[0]?.id ?? ""} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60">
            <option value="" disabled>Choose debt</option>
            {debts.map((debt) => <option key={debt.id} value={debt.id}>{debt.name}</option>)}
          </select>
        </label>
        <AccountSelect accounts={accounts} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          Amount
          <input name="amount" type="number" min="0.01" step="0.01" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Payment date
          <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
      </div>
      <input type="hidden" name="notes" value="Debt payment from debts and cards page" />
      <button disabled={isPending || debts.length === 0 || accounts.length === 0} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : "Record debt payment"}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

export function CardExpenseForm({ cards }: { cards: CardOption[] }) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-amber-100 bg-amber-50/70 p-4 shadow-card">
      <input type="hidden" name="type" value="credit_card_expense" />
      <label className="grid gap-2 text-sm font-black text-ink">
        Credit card
        <select name="credit_card_id" required defaultValue={cards[0]?.id ?? ""} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60">
          <option value="" disabled>Choose card</option>
          {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          Amount
          <input name="amount" type="number" min="0.01" step="0.01" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Expense date
          <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-black text-ink">
        Notes
        <input name="notes" placeholder="Example: Grocery, online shopping" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
      </label>
      <button disabled={isPending || cards.length === 0} className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : "Add card expense"}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

export function CardPaymentForm({ statements, accounts }: { statements: StatementOption[]; accounts: AccountOption[] }) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-blue-100 bg-blue-50/70 p-4 shadow-card">
      <input type="hidden" name="type" value="credit_card_payment" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          Statement
          <select name="statement_id" required defaultValue={statements[0]?.id ?? ""} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60">
            <option value="" disabled>Choose statement</option>
            {statements.map((statement) => <option key={statement.id} value={statement.id}>{statement.label}</option>)}
          </select>
        </label>
        <AccountSelect accounts={accounts} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          Amount
          <input name="amount" type="number" min="0.01" step="0.01" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Payment date
          <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
      </div>
      <input type="hidden" name="notes" value="Credit card payment from debts and cards page" />
      <button disabled={isPending || statements.length === 0 || accounts.length === 0} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : "Pay statement"}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

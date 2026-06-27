"use client";

import { useActionState } from "react";
import { saveTransaction, type TransactionActionState } from "@/app/(private)/transactions/actions";

export type PlanningAccountOption = { id: string; name: string; type: string; active: boolean };

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

function AccountSelect({ accounts }: { accounts: PlanningAccountOption[] }) {
  return (
    <label className="grid gap-2 text-xs font-black text-ink">
      Pay from
      <select name="account_id" required defaultValue={accounts[0]?.id ?? ""} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60">
        <option value="" disabled>Choose account</option>
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select>
    </label>
  );
}

export function PaySubscriptionForm({
  subscriptionId,
  categoryId,
  amount,
  accounts,
  frequency
}: {
  subscriptionId: string;
  categoryId: string | null;
  amount: number;
  accounts: PlanningAccountOption[];
  frequency: "monthly" | "yearly";
}) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="type" value="expense" />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="expense_related_entity_id" value={subscriptionId} />
      <input type="hidden" name="notes" value={frequency === "yearly" ? "Annual subscription paid from planning page" : "Monthly subscription paid from planning page"} />
      <div className="grid gap-3 sm:grid-cols-2">
        <AccountSelect accounts={accounts} />
        <label className="grid gap-2 text-xs font-black text-ink">
          Payment date
          <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
      </div>
      <button disabled={isPending || accounts.length === 0} className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : frequency === "yearly" ? "Pay annual subscription" : "Pay subscription"}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

export function ReserveSubscriptionForm({ subscriptionId, amount }: { subscriptionId: string; amount: number }) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
      <input type="hidden" name="type" value="sinking_fund_reserve" />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="reserve_entity_id" value={subscriptionId} />
      <input type="hidden" name="notes" value="Monthly reserve for annual subscription from planning page" />
      <label className="grid gap-2 text-xs font-black text-ink">
        Reserve date
        <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60" />
      </label>
      <button disabled={isPending} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-card transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : "Reserve monthly amount"}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

export function ReserveAnnualExpenseForm({ annualExpenseId, amount }: { annualExpenseId: string; amount: number }) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
      <input type="hidden" name="type" value="sinking_fund_reserve" />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="reserve_entity_id" value={annualExpenseId} />
      <input type="hidden" name="notes" value="Monthly reserve for annual expense from planning page" />
      <label className="grid gap-2 text-xs font-black text-ink">
        Reserve date
        <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60" />
      </label>
      <button disabled={isPending} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-card transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : "Reserve this month"}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

export function PayAnnualBillForm({
  annualExpenseId,
  categoryId,
  amount,
  accounts
}: {
  annualExpenseId: string;
  categoryId: string | null;
  amount: number;
  accounts: PlanningAccountOption[];
}) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3">
      <input type="hidden" name="type" value="expense" />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="expense_related_entity_id" value={annualExpenseId} />
      <input type="hidden" name="notes" value="Annual bill paid from planning page" />
      <div className="grid gap-3 sm:grid-cols-2">
        <AccountSelect accounts={accounts} />
        <label className="grid gap-2 text-xs font-black text-ink">
          Payment date
          <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-amber-100 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
      </div>
      <button disabled={isPending || accounts.length === 0} className="rounded-2xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-card transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : "Pay annual bill"}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

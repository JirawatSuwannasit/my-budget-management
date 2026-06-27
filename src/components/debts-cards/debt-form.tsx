"use client";

import { useActionState } from "react";
import { saveDebt, type DebtCardActionState } from "@/app/(private)/debts-cards/actions";

export type DebtFormValue = {
  id?: string;
  name?: string;
  type?: "personal_loan" | "interest_free" | "installment" | "credit_card_debt" | "other";
  original_amount?: number | string;
  remaining_balance?: number | string;
  interest_rate?: number | string;
  monthly_payment?: number | string;
  bonus_payment_amount?: number | string | null;
  target_payoff_date?: string | null;
  active?: boolean;
};

const initialState: DebtCardActionState = { status: "idle", message: "" };
const debtTypes = [
  { value: "interest_free", label: "Interest-free debt" },
  { value: "personal_loan", label: "Personal loan" },
  { value: "installment", label: "Product installment" },
  { value: "credit_card_debt", label: "Credit card debt" },
  { value: "other", label: "Other" }
];

export function DebtForm({ debt, compact = false }: { debt?: DebtFormValue; compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(saveDebt, initialState);
  const defaultDebt = !debt;

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {debt?.id ? <input type="hidden" name="id" value={debt.id} /> : null}

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-[1fr_0.8fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          Debt name
          <input name="name" defaultValue={debt?.name ?? (defaultDebt ? "Interest-free debt 500,000" : "")} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Debt type
          <select name="type" defaultValue={debt?.type ?? "interest_free"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            {debtTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          Original amount
          <input name="original_amount" type="number" min="0" step="0.01" defaultValue={debt?.original_amount ?? (defaultDebt ? 500000 : "")} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Remaining balance
          <input name="remaining_balance" type="number" min="0" step="0.01" defaultValue={debt?.remaining_balance ?? (defaultDebt ? 500000 : "")} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-3"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          Interest %
          <input name="interest_rate" type="number" min="0" step="0.0001" defaultValue={debt?.interest_rate ?? 0} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Monthly payment
          <input name="monthly_payment" type="number" min="0" step="0.01" defaultValue={debt?.monthly_payment ?? (defaultDebt ? 9000 : "")} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Bonus payment
          <input name="bonus_payment_amount" type="number" min="0" step="0.01" defaultValue={debt?.bonus_payment_amount ?? (defaultDebt ? 50000 : 0)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-black text-ink">
        Target payoff date
        <input name="target_payoff_date" type="date" defaultValue={debt?.target_payoff_date ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={debt?.active ?? true} className="h-5 w-5 accent-primary" />
        Active debt
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : debt?.id ? "Save debt" : "Add debt"}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}

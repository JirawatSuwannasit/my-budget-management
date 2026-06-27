"use client";

import { useActionState } from "react";
import { saveCreditCard, type DebtCardActionState } from "@/app/(private)/debts-cards/actions";

export type CreditCardFormValue = {
  id?: string;
  name?: string;
  billing_cut_day?: number | string;
  payment_due_day?: number | string;
  active?: boolean;
};

const initialState: DebtCardActionState = { status: "idle", message: "" };

export function CreditCardForm({ card }: { card?: CreditCardFormValue }) {
  const [state, formAction, isPending] = useActionState(saveCreditCard, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {card?.id ? <input type="hidden" name="id" value={card.id} /> : null}

      <label className="grid gap-2 text-sm font-black text-ink">
        Card name
        <input name="name" defaultValue={card?.name ?? ""} required placeholder="Example: KBank OneSiam" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          Billing cut day
          <input name="billing_cut_day" type="number" min="1" max="31" defaultValue={card?.billing_cut_day ?? 15} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Payment due day
          <input name="payment_due_day" type="number" min="1" max="31" defaultValue={card?.payment_due_day ?? 5} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={card?.active ?? true} className="h-5 w-5 accent-primary" />
        Active card
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : card?.id ? "Save card" : "Add card"}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}

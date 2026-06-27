"use client";

import { useActionState } from "react";
import { saveCreditCardStatement, type DebtCardActionState } from "@/app/(private)/debts-cards/actions";

export type CreditCardOption = { id: string; name: string; active?: boolean };
export type StatementFormValue = {
  id?: string;
  card_id?: string;
  cycle_start?: string;
  cycle_end?: string;
  statement_amount_due?: number | string;
  paid_amount?: number | string;
  due_date?: string;
};

const initialState: DebtCardActionState = { status: "idle", message: "" };

export function CreditCardStatementForm({ cards, statement, defaultCycleStart, defaultCycleEnd }: { cards: CreditCardOption[]; statement?: StatementFormValue; defaultCycleStart: string; defaultCycleEnd: string }) {
  const [state, formAction, isPending] = useActionState(saveCreditCardStatement, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {statement?.id ? <input type="hidden" name="id" value={statement.id} /> : null}

      <label className="grid gap-2 text-sm font-black text-ink">
        Credit card
        <select name="card_id" defaultValue={statement?.card_id ?? cards[0]?.id ?? ""} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
          <option value="" disabled>Choose card</option>
          {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-black text-ink">
          Cycle start
          <input name="cycle_start" type="date" defaultValue={statement?.cycle_start ?? defaultCycleStart} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Cycle end
          <input name="cycle_end" type="date" defaultValue={statement?.cycle_end ?? defaultCycleEnd} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Due date
          <input name="due_date" type="date" defaultValue={statement?.due_date ?? defaultCycleEnd} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          Statement amount due
          <input name="statement_amount_due" type="number" min="0" step="0.01" defaultValue={statement?.statement_amount_due ?? ""} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          Paid amount
          <input name="paid_amount" type="number" min="0" step="0.01" defaultValue={statement?.paid_amount ?? 0} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <button type="submit" disabled={isPending || cards.length === 0} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : statement?.id ? "Save statement" : "Add statement"}
      </button>

      {cards.length === 0 ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Add a credit card before creating a statement.</p> : null}
      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}

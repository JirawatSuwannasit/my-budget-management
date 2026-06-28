"use client";

import { useActionState } from "react";
import { saveCreditCardStatement, type DebtCardActionState } from "@/app/(private)/debts-cards/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

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

export function CreditCardStatementForm({ cards, statement, defaultCycleStart, defaultCycleEnd, locale }: { cards: CreditCardOption[]; statement?: StatementFormValue; defaultCycleStart: string; defaultCycleEnd: string; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveCreditCardStatement, initialState);
  const t = dictionaries[locale].debtsCards;
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {statement?.id ? <input type="hidden" name="id" value={statement.id} /> : null}
      <input type="hidden" name="locale" value={locale} />

      <label className="grid gap-2 text-sm font-black text-ink">
        {t.form.creditCard}
        <select name="card_id" defaultValue={statement?.card_id ?? cards[0]?.id ?? ""} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
          <option value="" disabled>{t.form.chooseCard}</option>
          {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.cycleStart}
          <input name="cycle_start" type="date" defaultValue={statement?.cycle_start ?? defaultCycleStart} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.cycleEnd}
          <input name="cycle_end" type="date" defaultValue={statement?.cycle_end ?? defaultCycleEnd} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.dueDate}
          <input name="due_date" type="date" defaultValue={statement?.due_date ?? defaultCycleEnd} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.statementAmountDue}
          <input name="statement_amount_due" type="number" min="0" step="0.01" defaultValue={statement?.statement_amount_due ?? ""} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.paidAmount}
          <input name="paid_amount" type="number" min="0" step="0.01" defaultValue={statement?.paid_amount ?? 0} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <button type="submit" disabled={isPending || cards.length === 0} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : statement?.id ? t.form.saveStatement : t.form.addStatement}
      </button>

      {cards.length === 0 ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{t.form.addCardFirst}</p> : null}
      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}

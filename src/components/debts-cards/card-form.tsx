"use client";

import { useActionState } from "react";
import { saveCreditCard, type DebtCardActionState } from "@/app/(private)/debts-cards/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type CreditCardFormValue = {
  id?: string;
  name?: string;
  billing_cut_day?: number | string;
  payment_due_day?: number | string;
  active?: boolean;
};

const initialState: DebtCardActionState = { status: "idle", message: "" };

export function CreditCardForm({ card, locale }: { card?: CreditCardFormValue; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveCreditCard, initialState);
  const t = dictionaries[locale].debtsCards;
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-line bg-surface p-4 shadow-card">
      {card?.id ? <input type="hidden" name="id" value={card.id} /> : null}
      <input type="hidden" name="locale" value={locale} />

      <label className="grid gap-2 text-sm font-black text-ink">
        {t.form.cardName}
        <input name="name" defaultValue={card?.name ?? ""} required placeholder={t.form.cardPlaceholder} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.billingCutDay}
          <input name="billing_cut_day" type="number" min="1" max="31" defaultValue={card?.billing_cut_day ?? 15} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.paymentDueDay}
          <input name="payment_due_day" type="number" min="1" max="31" defaultValue={card?.payment_due_day ?? 5} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={card?.active ?? true} className="h-5 w-5 accent-primary" />
        {t.form.activeCard}
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-canvas shadow-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : card?.id ? t.form.saveCard : t.form.addCard}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}>{state.message}</p> : null}
    </form>
  );
}

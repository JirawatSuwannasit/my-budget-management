"use client";

import { useActionState } from "react";
import { saveDebt, type DebtCardActionState } from "@/app/(private)/debts-cards/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

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
const debtTypes: Array<NonNullable<DebtFormValue["type"]>> = ["interest_free", "personal_loan", "installment", "credit_card_debt", "other"];

export function DebtForm({ debt, compact = false, locale }: { debt?: DebtFormValue; compact?: boolean; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveDebt, initialState);
  const defaultDebt = !debt;
  const t = dictionaries[locale].debtsCards;
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-line bg-surface p-4 shadow-card">
      {debt?.id ? <input type="hidden" name="id" value={debt.id} /> : null}
      <input type="hidden" name="locale" value={locale} />

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-[1fr_0.8fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.debtName}
          <input name="name" defaultValue={debt?.name ?? (defaultDebt ? (locale === "th" ? "หนี้ปลอดดอกเบี้ย 500,000" : "Interest-free debt 500,000") : "")} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.debtType}
          <select name="type" defaultValue={debt?.type ?? "interest_free"} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            {debtTypes.map((type) => <option key={type} value={type}>{t.debtTypes[type]}</option>)}
          </select>
        </label>
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.originalAmount}
          <input name="original_amount" type="number" min="0" step="0.01" defaultValue={debt?.original_amount ?? (defaultDebt ? 500000 : "")} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.remainingBalance}
          <input name="remaining_balance" type="number" min="0" step="0.01" defaultValue={debt?.remaining_balance ?? (defaultDebt ? 500000 : "")} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-3"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.interestPercent}
          <input name="interest_rate" type="number" min="0" step="0.0001" defaultValue={debt?.interest_rate ?? 0} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.monthlyPayment}
          <input name="monthly_payment" type="number" min="0" step="0.01" defaultValue={debt?.monthly_payment ?? (defaultDebt ? 9000 : "")} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.bonusPayment}
          <input name="bonus_payment_amount" type="number" min="0" step="0.01" defaultValue={debt?.bonus_payment_amount ?? (defaultDebt ? 50000 : 0)} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-black text-ink">
        {t.form.targetPayoffDate}
        <input name="target_payoff_date" type="date" defaultValue={debt?.target_payoff_date ?? ""} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={debt?.active ?? true} className="h-5 w-5 accent-primary" />
        {t.form.activeDebt}
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-canvas shadow-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : debt?.id ? t.form.saveDebt : t.form.addDebt}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}>{state.message}</p> : null}
    </form>
  );
}

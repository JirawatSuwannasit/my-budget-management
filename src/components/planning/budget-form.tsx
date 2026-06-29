"use client";

import { useActionState } from "react";
import { saveBudget, type PlanningActionState } from "@/app/(private)/planning/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type BudgetFormValue = {
  id?: string;
  label?: string;
  amount?: number | string;
  cycle_start_date?: string;
  active?: boolean;
  category_name?: string;
};

const initialState: PlanningActionState = { status: "idle", message: "" };
const budgetExamples = {
  th: ["ค่าใช้จ่ายประจำวัน", "ค่าเดินทาง", "ซื้อของทั่วไป", "ค่าใช้จ่ายฟุ่มเฟือย/ไม่จำเป็น"],
  en: ["Daily living expenses", "Transportation", "Miscellaneous shopping", "Luxury / non-essential spending"]
};

export function BudgetForm({ budget, cycleStartDate, compact = false, locale }: { budget?: BudgetFormValue; cycleStartDate: string; compact?: boolean; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveBudget, initialState);
  const idPrefix = budget?.id ?? "new";
  const t = dictionaries[locale].planning;
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-line bg-surface p-4 shadow-card">
      {budget?.id ? <input type="hidden" name="id" value={budget.id} /> : null}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="cycle_start_date" value={budget?.cycle_start_date ?? cycleStartDate} />

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-[1fr_0.75fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"budget-label-" + idPrefix}>
          {t.form.budgetName}
          <input id={"budget-label-" + idPrefix} name="label" list="budget-examples" defaultValue={budget?.label ?? ""} placeholder={t.form.budgetPlaceholder} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
          <datalist id="budget-examples">
            {budgetExamples[locale].map((example) => <option key={example} value={example} />)}
          </datalist>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"budget-amount-" + idPrefix}>
          {t.form.amountPerCycle}
          <input id={"budget-amount-" + idPrefix} name="amount" type="number" min="0" step="0.01" defaultValue={budget?.amount ?? ""} placeholder="0.00" required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"budget-category-" + idPrefix}>
        {t.form.matchingExpenseCategory}
        <input id={"budget-category-" + idPrefix} name="category_name" list="budget-examples" defaultValue={budget?.category_name ?? budget?.label ?? ""} placeholder={t.form.matchingExpensePlaceholder} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={budget?.active ?? true} className="h-5 w-5 accent-primary" />
        {t.form.activeBudget}
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-canvas shadow-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : budget?.id ? t.form.saveBudget : t.form.addBudget}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}>{state.message}</p> : null}
    </form>
  );
}

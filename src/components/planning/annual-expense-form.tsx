"use client";

import { useActionState } from "react";
import { saveAnnualExpense, type PlanningActionState } from "@/app/(private)/planning/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type AnnualExpenseFormValue = {
  id?: string;
  name?: string;
  category_name?: string;
  annual_amount?: number | string;
  due_date?: string | null;
  active?: boolean;
};

const initialState: PlanningActionState = { status: "idle", message: "" };
const annualExamples = {
  th: ["ค่าส่วนกลางคอนโด", "ประกันคอนโด", "ค่าสมาชิกฟุตบอลรายปี"],
  en: ["Condo common fee", "Condo insurance", "Annual football app subscription"]
};
const annualCategories = {
  th: ["บ้าน/คอนโด", "ประกัน", "กีฬา / ฟุตบอล", "อื่นๆ"],
  en: ["Housing", "Insurance", "Sports / football", "Other"]
};

export function AnnualExpenseForm({ annualExpense, compact = false, locale }: { annualExpense?: AnnualExpenseFormValue; compact?: boolean; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveAnnualExpense, initialState);
  const idPrefix = annualExpense?.id ?? "new";
  const t = dictionaries[locale].planning;
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {annualExpense?.id ? <input type="hidden" name="id" value={annualExpense.id} /> : null}
      <input type="hidden" name="locale" value={locale} />

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-[1fr_0.8fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"annual-name-" + idPrefix}>
          {t.form.annualExpense}
          <input id={"annual-name-" + idPrefix} name="name" list="annual-examples" defaultValue={annualExpense?.name ?? ""} placeholder={t.form.annualPlaceholder} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
          <datalist id="annual-examples">
            {annualExamples[locale].map((example) => <option key={example} value={example} />)}
          </datalist>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"annual-category-" + idPrefix}>
          {t.form.category}
          <select id={"annual-category-" + idPrefix} name="category_name" defaultValue={annualExpense?.category_name ?? annualCategories[locale][0]} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            {annualCategories[locale].map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.annualAmount}
          <input name="annual_amount" type="number" min="0" step="0.01" defaultValue={annualExpense?.annual_amount ?? ""} placeholder="0.00" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.dueDate}
          <input name="due_date" type="date" defaultValue={annualExpense?.due_date ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={annualExpense?.active ?? true} className="h-5 w-5 accent-primary" />
        {t.form.activeSinkingFund}
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : annualExpense?.id ? t.form.saveAnnualExpense : t.form.addAnnualExpense}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}

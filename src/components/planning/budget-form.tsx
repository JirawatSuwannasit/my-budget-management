"use client";

import { useActionState } from "react";
import { saveBudget, type PlanningActionState } from "@/app/(private)/planning/actions";

export type BudgetFormValue = {
  id?: string;
  label?: string;
  amount?: number | string;
  cycle_start_date?: string;
  active?: boolean;
  category_name?: string;
};

const initialState: PlanningActionState = { status: "idle", message: "" };
const budgetExamples = ["Daily living expenses", "Transportation", "Miscellaneous shopping", "Luxury / non-essential spending"];

export function BudgetForm({ budget, cycleStartDate, compact = false }: { budget?: BudgetFormValue; cycleStartDate: string; compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(saveBudget, initialState);
  const idPrefix = budget?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {budget?.id ? <input type="hidden" name="id" value={budget.id} /> : null}
      <input type="hidden" name="cycle_start_date" value={budget?.cycle_start_date ?? cycleStartDate} />

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-[1fr_0.75fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"budget-label-" + idPrefix}>
          ชื่องบ
          <input id={"budget-label-" + idPrefix} name="label" list="budget-examples" defaultValue={budget?.label ?? ""} placeholder="เช่น Daily living expenses" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
          <datalist id="budget-examples">
            {budgetExamples.map((example) => <option key={example} value={example} />)}
          </datalist>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"budget-amount-" + idPrefix}>
          จำนวนเงินต่อรอบ
          <input id={"budget-amount-" + idPrefix} name="amount" type="number" min="0" step="0.01" defaultValue={budget?.amount ?? ""} placeholder="0.00" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"budget-category-" + idPrefix}>
        หมวดรายจ่ายที่ใช้จับคู่
        <input id={"budget-category-" + idPrefix} name="category_name" list="budget-examples" defaultValue={budget?.category_name ?? budget?.label ?? ""} placeholder="ใช้ชื่อเดียวกับงบได้" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={budget?.active ?? true} className="h-5 w-5 accent-primary" />
        ใช้งานงบนี้
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "กำลังบันทึก..." : budget?.id ? "บันทึกงบ" : "เพิ่มงบ"}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}

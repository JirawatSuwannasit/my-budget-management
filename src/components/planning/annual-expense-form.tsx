"use client";

import { useActionState } from "react";
import { saveAnnualExpense, type PlanningActionState } from "@/app/(private)/planning/actions";

export type AnnualExpenseFormValue = {
  id?: string;
  name?: string;
  category_name?: string;
  annual_amount?: number | string;
  due_date?: string | null;
  active?: boolean;
};

const initialState: PlanningActionState = { status: "idle", message: "" };
const annualExamples = ["Condo common fee", "Condo insurance", "Annual football app subscription"];
const annualCategories = ["Housing", "Insurance", "Sports / football", "Other"];

export function AnnualExpenseForm({ annualExpense, compact = false }: { annualExpense?: AnnualExpenseFormValue; compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(saveAnnualExpense, initialState);
  const idPrefix = annualExpense?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {annualExpense?.id ? <input type="hidden" name="id" value={annualExpense.id} /> : null}

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-[1fr_0.8fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"annual-name-" + idPrefix}>
          ค่าใช้จ่ายรายปี
          <input id={"annual-name-" + idPrefix} name="name" list="annual-examples" defaultValue={annualExpense?.name ?? ""} placeholder="เช่น Condo common fee" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
          <datalist id="annual-examples">
            {annualExamples.map((example) => <option key={example} value={example} />)}
          </datalist>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"annual-category-" + idPrefix}>
          หมวด
          <select id={"annual-category-" + idPrefix} name="category_name" defaultValue={annualExpense?.category_name ?? "Housing"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            {annualCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          จำนวนเงินต่อปี
          <input name="annual_amount" type="number" min="0" step="0.01" defaultValue={annualExpense?.annual_amount ?? ""} placeholder="0.00" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          วันครบกำหนด
          <input name="due_date" type="date" defaultValue={annualExpense?.due_date ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={annualExpense?.active ?? true} className="h-5 w-5 accent-primary" />
        ใช้งาน sinking fund นี้
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "กำลังบันทึก..." : annualExpense?.id ? "บันทึกค่าใช้จ่ายรายปี" : "เพิ่มค่าใช้จ่ายรายปี"}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}

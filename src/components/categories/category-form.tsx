"use client";

import { useActionState } from "react";
import { saveCategory, type CategoryActionState } from "@/app/(private)/categories/actions";
import type { CategoryKind } from "@/lib/finance/types";

export type CategoryFormValue = {
  id?: string;
  name?: string;
  kind?: CategoryKind;
  color?: string | null;
  icon_key?: string | null;
  active?: boolean;
};

const initialState: CategoryActionState = { status: "idle", message: "" };
const categoryKinds: Array<{ value: CategoryKind; label: string }> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "subscription", label: "Subscription" },
  { value: "sinking_fund", label: "Sinking fund" },
  { value: "debt", label: "Debt" },
  { value: "investment", label: "Investment" },
  { value: "transfer", label: "Transfer" },
  { value: "other", label: "Other" }
];
const colorOptions = [
  { value: "#0f766e", label: "Teal" },
  { value: "#2563eb", label: "Blue" },
  { value: "#16a34a", label: "Green" },
  { value: "#d97706", label: "Amber" },
  { value: "#dc2626", label: "Red" },
  { value: "#475569", label: "Slate" }
];
const iconOptions = ["tag", "wallet", "receipt", "repeat", "piggy-bank", "credit-card", "trending-up", "arrow-left-right"];

export function CategoryForm({ category, compact = false }: { category?: CategoryFormValue; compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(saveCategory, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {category?.id ? <input type="hidden" name="id" value={category.id} /> : null}

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-[1fr_0.8fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          Category name
          <input name="name" defaultValue={category?.name ?? ""} placeholder="Example: Daily food" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          Type
          <select name="kind" defaultValue={category?.kind ?? "expense"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            {categoryKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
          </select>
        </label>
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          Color
          <select name="color" defaultValue={category?.color ?? "#0f766e"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            {colorOptions.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          Icon
          <select name="icon_key" defaultValue={category?.icon_key ?? "tag"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            {iconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={category?.active ?? true} className="h-5 w-5 accent-primary" />
        Active category
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Saving..." : category?.id ? "Save category" : "Add category"}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { saveCategory, type CategoryActionState } from "@/app/(private)/categories/actions";
import type { CategoryKind } from "@/lib/finance/types";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type CategoryFormValue = {
  id?: string;
  name?: string;
  kind?: CategoryKind;
  color?: string | null;
  icon_key?: string | null;
  active?: boolean;
};

const initialState: CategoryActionState = { status: "idle", message: "" };
const colorOptions = [
  { value: "#0f766e", key: "teal" },
  { value: "#2563eb", key: "blue" },
  { value: "#16a34a", key: "green" },
  { value: "#d97706", key: "amber" },
  { value: "#dc2626", key: "red" },
  { value: "#475569", key: "slate" }
];
const iconOptions = ["tag", "wallet", "receipt", "repeat", "piggy-bank", "credit-card", "trending-up", "arrow-left-right"];

export function CategoryForm({ category, compact = false, locale }: { category?: CategoryFormValue; compact?: boolean; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveCategory, initialState);
  const t = dictionaries[locale].categories;
  const common = dictionaries[locale].common;
  const categoryKinds: CategoryKind[] = ["expense", "income", "subscription", "sinking_fund", "debt", "investment", "transfer", "other"];

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-line bg-surface p-4 shadow-card">
      {category?.id ? <input type="hidden" name="id" value={category.id} /> : null}
      <input type="hidden" name="locale" value={locale} />

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-[1fr_0.8fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.name}
          <input name="name" defaultValue={category?.name ?? ""} placeholder={t.form.namePlaceholder} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.type}
          <select name="kind" defaultValue={category?.kind ?? "expense"} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            {categoryKinds.map((kind) => <option key={kind} value={kind}>{t.kinds[kind]}</option>)}
          </select>
        </label>
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.color}
          <select name="color" defaultValue={category?.color ?? "#0f766e"} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            {colorOptions.map((color) => <option key={color.value} value={color.value}>{t.colors[color.key as keyof typeof t.colors]}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.icon}
          <select name="icon_key" defaultValue={category?.icon_key ?? "tag"} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            {iconOptions.map((icon) => <option key={icon} value={icon}>{t.icons[icon as keyof typeof t.icons]}</option>)}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={category?.active ?? true} className="h-5 w-5 accent-primary" />
        {t.form.active}
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-canvas shadow-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : category?.id ? t.form.save : t.form.add}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}>{state.message}</p> : null}
    </form>
  );
}

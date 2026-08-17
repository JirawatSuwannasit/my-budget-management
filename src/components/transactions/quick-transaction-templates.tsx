"use client";

import { useActionState } from "react";
import { deleteQuickTemplate, saveQuickTemplate, toggleQuickTemplate, type QuickTemplateActionState } from "@/app/(private)/transactions/quick-template-actions";
import { LazyDetails } from "@/components/ui/lazy-details";
import { isQuickTransactionType } from "@/lib/finance/quick-templates";
import type { QuickTransactionTemplate } from "@/lib/finance/types";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

type Option = { id: string; name: string; active: boolean };
type Props = { templates: QuickTransactionTemplate[]; locale: Locale; accounts: Option[]; categories: Option[] };
const initial: QuickTemplateActionState = { status: "idle", message: "" };

function TemplateForm({ value, locale, accounts, categories }: Omit<Props, "templates"> & { value?: QuickTransactionTemplate }) {
  const [state, action, pending] = useActionState(saveQuickTemplate, initial);
  const t = dictionaries[locale].transactions.quickAdd;
  const tx = dictionaries[locale].transactions;
  return (
    <form action={action} className="mt-3 grid gap-3 rounded-2xl bg-elevated p-3">
      {value ? <input type="hidden" name="id" value={value.id} /> : null}
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-black text-ink">{t.name}<input name="name" required defaultValue={value?.name} className="rounded-xl border border-line bg-surface px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-black text-ink">{tx.form.type}<select name="type" defaultValue={isQuickTransactionType(value?.type) ? value.type : "expense"} className="rounded-xl border border-line bg-surface px-3 py-2"><option value="expense">{tx.types.expense}</option><option value="income">{tx.types.income}</option></select></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-black text-ink">{t.amount}<input name="amount" type="number" min="0.01" step="0.01" defaultValue={value?.amount ?? ""} placeholder={t.enterWhenUsed} className="rounded-xl border border-line bg-surface px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-black text-ink">{t.icon}<input name="icon_key" maxLength={8} defaultValue={value?.icon_key ?? "⚡"} className="rounded-xl border border-line bg-surface px-3 py-2" /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-black text-ink">{t.account}<select name="account_id" defaultValue={value?.account_id ?? ""} className="rounded-xl border border-line bg-surface px-3 py-2"><option value="">{t.choose}</option>{accounts.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-black text-ink">{t.category}<select name="category_id" defaultValue={value?.category_id ?? ""} className="rounded-xl border border-line bg-surface px-3 py-2"><option value="">{t.choose}</option>{categories.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-black text-ink"><input name="active" type="checkbox" defaultChecked={value?.active ?? true} className="h-4 w-4 accent-primary" />{dictionaries[locale].common.active}</label>
      <button disabled={pending} className="min-h-11 rounded-xl bg-primary px-4 font-black text-canvas disabled:opacity-60">{pending ? t.saving : t.save}</button>
      {state.message ? <p role="status" className={state.status === "success" ? "text-sm font-bold text-income" : "text-sm font-bold text-danger"}>{state.message}</p> : null}
    </form>
  );
}

export function QuickTransactionTemplates({ templates, locale, accounts, categories }: Props) {
  const t = dictionaries[locale].transactions.quickAdd;
  const categoryNames = new Map(categories.map((item) => [item.id, item.name]));
  return (
    <LazyDetails className="rounded-panel border border-line bg-surface p-4 shadow-card" summaryClassName="cursor-pointer text-sm font-black text-primary" summary={`${t.settings} · ${templates.length}`}>
      <div className="mt-3 grid gap-2">
        {templates.map((template) => {
          const supported = isQuickTransactionType(template.type);
          return <article key={template.id} className="rounded-2xl border border-line bg-elevated p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-black text-ink">{template.icon_key ?? "⚡"} {template.name}{template.amount !== null ? ` · ฿${Number(template.amount).toLocaleString()}` : ` · ${t.enterWhenUsed}`}{template.category_id ? ` · ${categoryNames.get(template.category_id) ?? t.category}` : ""}</p>{!supported ? <p className="mt-1 text-xs font-bold text-warning">{t.unsupported}</p> : null}</div>
              <div className="flex flex-wrap gap-3 text-sm font-black">
                {supported ? <LazyDetails summaryClassName="cursor-pointer text-primary" summary={t.edit}><TemplateForm value={template} locale={locale} accounts={accounts} categories={categories} /></LazyDetails> : null}
                {supported ? <form action={toggleQuickTemplate}><input type="hidden" name="id" value={template.id} /><input type="hidden" name="active" value={String(!template.active)} /><button className="text-warning">{template.active ? t.disable : t.enable}</button></form> : null}
                <form action={deleteQuickTemplate}><input type="hidden" name="id" value={template.id} /><button className="text-danger">{t.delete}</button></form>
              </div>
            </div>
          </article>;
        })}
        <LazyDetails className="mt-1" summaryClassName="cursor-pointer text-sm font-black text-primary" summary={`+ ${t.add}`}><TemplateForm locale={locale} accounts={accounts} categories={categories} /></LazyDetails>
      </div>
    </LazyDetails>
  );
}

"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { executeQuickTemplate, type TransactionActionState } from "@/app/(private)/transactions/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import type { QuickTransactionTemplate } from "@/lib/finance/types";

const initial: TransactionActionState = { status: "idle", message: "" };
function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function QuickItem({ template, locale }: { template: QuickTransactionTemplate; locale: Locale }) {
  const [state, action, pending] = useActionState(executeQuickTemplate, initial);
  const [open, setOpen] = useState(false); const input = useRef<HTMLInputElement>(null);
  const t = dictionaries[locale].transactions.quickAdd;
  useEffect(() => { if (open) input.current?.focus(); if (state.status === "success") setOpen(false); }, [open, state.status]);
  const submitDirect = template.amount !== null;
  return <div className="shrink-0">
    <form action={action}>
      <input type="hidden" name="template_id" value={template.id}/><input type="hidden" name="locale" value={locale}/><input type="hidden" name="transaction_date" value={localDate()}/>
      <button type={submitDirect ? "submit" : "button"} onClick={submitDirect ? undefined : () => setOpen(true)} disabled={pending} className="min-h-12 rounded-2xl border border-primary/25 bg-surface px-4 py-3 text-sm font-black text-ink shadow-card disabled:opacity-60">
        {pending ? "…" : `${template.icon_key ?? "⚡"} ${template.name}${template.amount !== null ? ` · ฿${Number(template.amount).toLocaleString()}` : ""}`}
      </button>
      {open ? <div className="mt-2 flex gap-2"><input ref={input} name="amount" type="number" min="0.01" step="0.01" required placeholder={t.enterAmount} className="w-36 rounded-2xl border border-line bg-elevated px-3 py-2"/><button disabled={pending} className="rounded-2xl bg-primary px-4 text-sm font-black text-canvas">{t.execute}</button></div> : null}
    </form>
    {state.message ? <p role="status" className={`mt-2 max-w-64 text-xs font-bold ${state.status === "success" ? "text-income" : "text-danger"}`}>{state.message}</p> : null}
  </div>;
}
export function QuickAddList({ templates, locale }: { templates: QuickTransactionTemplate[]; locale: Locale }) {
  const t = dictionaries[locale].transactions.quickAdd;
  return <section className="rounded-panel border border-line bg-elevated/60 p-4"><h2 className="text-xl font-black text-ink">{t.title}</h2><p className="mt-1 text-sm font-semibold text-muted">{t.description}</p>{templates.length ? <div className="mt-3 flex gap-3 overflow-x-auto pb-2">{templates.map(x => <QuickItem key={x.id} template={x} locale={locale}/>)}</div> : <p className="mt-3 rounded-2xl border border-dashed border-line px-4 py-3 text-sm font-bold text-muted">{t.empty}</p>}</section>;
}

"use client";

import { useActionState } from "react";
import { saveAccount, type AccountActionState } from "@/app/(private)/accounts/actions";
import type { AccountType } from "@/lib/finance/types";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

type AccountFormValue = { id?: string; name?: string; type?: AccountType; balance?: number | string; active?: boolean };

const accountTypeOrder: AccountType[] = ["main_bank", "other_bank", "cash", "wallet", "investment"];

const initialState: AccountActionState = { status: "idle", message: "" };

export function AccountForm({ account, compact = false, locale }: { account?: AccountFormValue; compact?: boolean; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveAccount, initialState);
  const t = dictionaries[locale].accounts;
  const nameId = account?.id ? "account-name-" + account.id : "account-name-new";
  const typeId = account?.id ? "account-type-" + account.id : "account-type-new";
  const balanceId = account?.id ? "account-balance-" + account.id : "account-balance-new";

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {account?.id ? <input type="hidden" name="id" value={account.id} /> : null}
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-2">
        <label className="text-sm font-black text-ink" htmlFor={nameId}>{t.form.name}</label>
        <input id={nameId} name="name" defaultValue={account?.name ?? ""} placeholder={t.form.namePlaceholder} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={typeId}>
          {t.form.type}
          <select id={typeId} name="type" defaultValue={account?.type ?? "main_bank"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            {accountTypeOrder.map((type) => (
              <option key={type} value={type}>{t.types[type]} - {type === "investment" ? t.form.investmentHint : t.form.cashLikeHint}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={balanceId}>
          {t.form.balance}
          <input id={balanceId} name="balance" type="number" step="0.01" min="0" defaultValue={account?.balance ?? 0} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={account?.active ?? true} className="h-5 w-5 accent-primary" />
        {t.form.active}
      </label>

      <button type="submit" disabled={isPending} className="min-h-12 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? dictionaries[locale].common.saving : account?.id ? t.form.save : t.form.add}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}

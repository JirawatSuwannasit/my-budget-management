"use client";

import { useActionState } from "react";
import { saveAccount, type AccountActionState } from "@/app/(private)/accounts/actions";
import { Button, Input, Select } from "@/components/ui";
import type { AccountType } from "@/lib/finance/types";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

type AccountFormValue = { id?: string; name?: string; type?: AccountType; balance?: number | string; low_balance_threshold?: number | string | null; active?: boolean };

const accountTypeOrder: AccountType[] = ["main_bank", "other_bank", "cash", "wallet", "savings", "investment"];

const initialState: AccountActionState = { status: "idle", message: "" };

export function AccountForm({ account, compact = false, locale }: { account?: AccountFormValue; compact?: boolean; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveAccount, initialState);
  const t = dictionaries[locale].accounts;
  const nameId = account?.id ? "account-name-" + account.id : "account-name-new";
  const typeId = account?.id ? "account-type-" + account.id : "account-type-new";
  const balanceId = account?.id ? "account-balance-" + account.id : "account-balance-new";
  const lowBalanceThresholdId = account?.id ? "account-low-balance-threshold-" + account.id : "account-low-balance-threshold-new";

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-line bg-surface p-4 shadow-card">
      {account?.id ? <input type="hidden" name="id" value={account.id} /> : null}
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-2">
        <label className="text-sm font-black text-ink" htmlFor={nameId}>{t.form.name}</label>
        <Input id={nameId} name="name" defaultValue={account?.name ?? ""} placeholder={t.form.namePlaceholder} required />
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={typeId}>
          {t.form.type}
          <Select id={typeId} name="type" defaultValue={account?.type ?? "main_bank"}>
            {accountTypeOrder.map((type) => (
              <option key={type} value={type}>{t.types[type]} - {type === "savings" ? t.form.savingsHint : type === "investment" ? t.form.investmentHint : t.form.cashLikeHint}</option>
            ))}
          </Select>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={balanceId}>
          {t.form.balance}
          <Input id={balanceId} name="balance" type="number" step="0.01" min="0" defaultValue={account?.balance ?? 0} required className="tabular-nums" />
        </label>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-black text-ink" htmlFor={lowBalanceThresholdId}>{t.form.lowBalanceThreshold}</label>
        <Input id={lowBalanceThresholdId} name="low_balance_threshold" type="number" step="0.01" min="0" defaultValue={account?.low_balance_threshold ?? ""} className="tabular-nums" />
        <p className="text-xs font-semibold text-muted">{t.form.lowBalanceThresholdHint}</p>
      </div>

      <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-elevated px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={account?.active ?? true} className="h-5 w-5 accent-primary" />
        {t.form.active}
      </label>

      <Button type="submit" disabled={isPending}>
        {isPending ? dictionaries[locale].common.saving : account?.id ? t.form.save : t.form.add}
      </Button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}>{state.message}</p> : null}
    </form>
  );
}

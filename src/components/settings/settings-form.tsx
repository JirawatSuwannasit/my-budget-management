"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveSettings, type SettingsActionState } from "@/app/(private)/settings/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type SettingsAccountOption = { id: string; name: string; active: boolean };

type SettingsFormProps = {
  locale: Locale;
  currency: string;
  financialCycleStartDay: number;
  bonusMonths: number[];
  defaultAccountId: string | null;
  accounts: SettingsAccountOption[];
};

const initialState: SettingsActionState = { status: "idle", message: "" };
const months = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" }
];

export function SettingsForm({ locale, currency, financialCycleStartDay, bonusMonths, defaultAccountId, accounts }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(saveSettings, initialState);
  const router = useRouter();
  const t = dictionaries[locale].settings;

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card md:p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.language}
          <select name="locale" defaultValue={locale} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="th">{t.thai}</option>
            <option value="en">{t.english}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          {t.currency}
          {/* Currency is fixed to THB in this phase. Multi-currency formatting is out of scope until a later phase,
              so this control is rendered read-only rather than faking a switch. The disabled select still shows the
              value, and the hidden input keeps "THB" in the submitted form data. */}
          <select name="currency" defaultValue={currency} disabled aria-readonly="true" className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-muted outline-none transition">
            <option value="THB">THB</option>
          </select>
          <input type="hidden" name="currency" value="THB" />
          <span className="text-xs font-bold text-muted">{t.currencyFixedNote}</span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.cycleStartDay}
          <input name="financial_cycle_start_day" type="number" min="1" max="28" defaultValue={financialCycleStartDay} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          {t.defaultAccount}
          <select name="default_account_id" defaultValue={defaultAccountId ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="">{t.noDefaultAccount}</option>
            {accounts.filter((account) => account.active).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-black text-ink">{t.bonusMonths}</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {months.map((month) => (
            <label key={month.value} className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-muted">
              <input name="bonus_months" type="checkbox" value={month.value} defaultChecked={bonusMonths.includes(month.value)} className="h-4 w-4 accent-primary" />
              {month.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? t.saving : t.save}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}

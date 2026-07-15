"use client";

import { useActionState } from "react";
import { saveSubscription, type PlanningActionState } from "@/app/(private)/planning/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type SubscriptionFormValue = {
  id?: string;
  name?: string;
  category_name?: string;
  frequency?: "monthly" | "yearly";
  price?: number | string;
  billing_day?: number | string;
  payment_method?: string | null;
  source_account_id?: string | null;
  source_card_id?: string | null;
  active?: boolean;
};

export type SubscriptionAccountOption = { id: string; name: string; type: string; active: boolean };
export type SubscriptionCardOption = { id: string; name: string };

const initialState: PlanningActionState = { status: "idle", message: "" };
const subscriptionCategories = {
  th: ["AI", "กีฬา / ฟุตบอล", "ความบันเทิง", "เครื่องมือทำงาน", "อื่นๆ"],
  en: ["AI", "Sports / football", "Entertainment", "Productivity", "Other"]
};
const subscriptionExamples = {
  th: ["ChatGPT", "Claude", "แอปดูฟุตบอล Premier League", "Netflix", "Notion"],
  en: ["ChatGPT", "Claude", "Premier League football streaming app", "Netflix", "Notion"]
};

export function SubscriptionForm({
  subscription,
  accounts,
  creditCards,
  compact = false,
  locale
}: {
  subscription?: SubscriptionFormValue;
  accounts: SubscriptionAccountOption[];
  creditCards: SubscriptionCardOption[];
  compact?: boolean;
  locale: Locale;
}) {
  const [state, formAction, isPending] = useActionState(saveSubscription, initialState);
  const idPrefix = subscription?.id ?? "new";
  const t = dictionaries[locale].planning;
  const common = dictionaries[locale].common;
  const defaultSource = subscription?.source_card_id
    ? "card:" + subscription.source_card_id
    : subscription?.source_account_id
      ? "account:" + subscription.source_account_id
      : "";

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-line bg-surface p-4 shadow-card">
      {subscription?.id ? <input type="hidden" name="id" value={subscription.id} /> : null}
      <input type="hidden" name="locale" value={locale} />

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-[1fr_0.8fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"subscription-name-" + idPrefix}>
          {t.form.subscriptionName}
          <input id={"subscription-name-" + idPrefix} name="name" list="subscription-examples" defaultValue={subscription?.name ?? ""} placeholder={t.form.subscriptionPlaceholder} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
          <datalist id="subscription-examples">
            {subscriptionExamples[locale].map((example) => <option key={example} value={example} />)}
          </datalist>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"subscription-category-" + idPrefix}>
          {t.form.category}
          <select id={"subscription-category-" + idPrefix} name="category_name" defaultValue={subscription?.category_name ?? "AI"} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            {subscriptionCategories[locale].map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-3"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.billingCycle}
          <select name="frequency" defaultValue={subscription?.frequency ?? "monthly"} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            <option value="monthly">{t.form.monthlyOption}</option>
            <option value="yearly">{t.form.yearlyOption}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.price}
          <input name="price" type="number" min="0" step="0.01" defaultValue={subscription?.price ?? ""} placeholder="0.00" required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          {t.billingDay}
          <input name="billing_day" type="number" min="1" max="31" step="1" defaultValue={subscription?.billing_day ?? 1} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"subscription-payment-source-" + idPrefix}>
        {t.form.paymentSourceLabel}
        <select id={"subscription-payment-source-" + idPrefix} name="payment_source" defaultValue={defaultSource} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
          <option value="">{t.form.paymentSourceNone}</option>
          {accounts.length > 0 ? (
            <optgroup label={t.payment.accountGroup}>
              {accounts.map((account) => <option key={account.id} value={"account:" + account.id}>{account.name}</option>)}
            </optgroup>
          ) : null}
          {creditCards.length > 0 ? (
            <optgroup label={t.payment.cardGroup}>
              {creditCards.map((card) => <option key={card.id} value={"card:" + card.id}>{card.name}</option>)}
            </optgroup>
          ) : null}
        </select>
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={subscription?.active ?? true} className="h-5 w-5 accent-primary" />
        {t.form.activeSubscription}
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-canvas shadow-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : subscription?.id ? t.form.saveSubscription : t.form.addSubscription}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}>{state.message}</p> : null}
    </form>
  );
}

import { WalletCards } from "lucide-react";
import { AccountForm } from "@/components/accounts/account-form";
import { setAccountActive } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import type { AccountType } from "@/lib/finance/types";

type AccountRow = { id: string; name: string; type: AccountType; balance: number | string; active: boolean; is_cash_like: boolean };

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(value));
}

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle() : { data: null };
  const locale = isLocale(profile?.locale) ? profile.locale : "th";
  const t = dictionaries[locale].accounts;
  const common = dictionaries[locale].common;

  const { data, error } = await supabase.from("accounts").select("id,name,type,balance,active,is_cash_like").order("active", { ascending: false }).order("name");
  const accounts = (data ?? []) as AccountRow[];
  const cashLikeTotal = accounts.filter((account) => account.active && account.is_cash_like).reduce((total, account) => total + Number(account.balance), 0);
  const investmentTotal = accounts.filter((account) => account.active && !account.is_cash_like).reduce((total, account) => total + Number(account.balance), 0);

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-elevated via-surface to-surface p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">{t.eyebrow}</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">{t.subtitle}</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-canvas shadow-card"><WalletCards size={22} aria-hidden="true" /></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-panel border border-income/20 bg-income/10 p-4 text-income shadow-card">
          <p className="text-xs font-black uppercase tracking-normal opacity-70">{t.cashLikeTotal}</p>
          <p className="mt-3 text-3xl font-black">{formatMoney(cashLikeTotal)}</p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4 text-ink shadow-card">
          <p className="text-xs font-black uppercase tracking-normal text-muted">{t.investmentTotal}</p>
          <p className="mt-3 text-3xl font-black">{formatMoney(investmentTotal)}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="mb-3 text-xl font-black text-ink">{t.addAccount}</h2>
          <AccountForm locale={locale} />
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink">{t.accountList}</h2>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-black text-muted shadow-card">{accounts.length} {t.countSuffix}</span>
          </div>

          {error ? <p className="rounded-panel border border-danger/30 bg-danger/10 p-4 text-sm font-bold text-danger">{t.loadError}: {error.message}</p> : null}
          {!error && accounts.length === 0 ? <p className="rounded-panel border border-dashed border-line bg-surface/80 p-5 text-sm font-bold text-muted">{t.empty}</p> : null}

          {accounts.map((account) => (
            <article key={account.id} className="rounded-panel border border-line bg-surface p-4 shadow-card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-ink">{account.name}</h3>
                    <span className={"rounded-full px-2.5 py-1 text-xs font-black " + (account.active ? "bg-income/10 text-income" : "bg-elevated text-muted")}>{account.active ? common.active : common.inactive}</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{t.types[account.type]}</span>
                  </div>
                  <p className="mt-2 text-2xl font-black text-ink">{formatMoney(account.balance)}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">{account.is_cash_like ? t.countsAsReal : t.investmentNote}</p>
                </div>
                <form action={setAccountActive}>
                  <input type="hidden" name="id" value={account.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="active" value={account.active ? "false" : "true"} />
                  <button className="min-h-11 rounded-full border border-line bg-surface px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">{account.active ? common.deactivate : common.activate}</button>
                </form>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-black text-primary">{t.editAccount}</summary>
                <div className="mt-3"><AccountForm account={account} compact locale={locale} /></div>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

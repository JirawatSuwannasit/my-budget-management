import { CalendarDays, Languages, LogOut, Settings, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { LogoutButton } from "@/components/settings/logout-button";
import { SettingsForm } from "@/components/settings/settings-form";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  locale: string | null;
  currency: string | null;
  financial_cycle_start_day: number | null;
};

type AppSettingsRow = {
  bonus_months: number[] | null;
  default_account_id: string | null;
};

type AccountRow = {
  id: string;
  name: string;
  active: boolean;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [profileResult, appSettingsResult, accountsResult] = await Promise.all([
    supabase.from("profiles").select("locale,currency,financial_cycle_start_day").eq("user_id", user?.id ?? "").maybeSingle(),
    supabase.from("app_settings").select("bonus_months,default_account_id").eq("user_id", user?.id ?? "").maybeSingle(),
    supabase.from("accounts").select("id,name,active").order("active", { ascending: false }).order("name")
  ]);

  const profile = (profileResult.data ?? null) as ProfileRow | null;
  const appSettings = (appSettingsResult.data ?? null) as AppSettingsRow | null;
  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const locale = isLocale(profile?.locale) ? profile.locale : "th";
  const t = dictionaries[locale].settings;
  const loadError = profileResult.error ?? appSettingsResult.error ?? accountsResult.error;

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-white via-teal-50 to-blue-50 p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">{t.eyebrow}</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">{t.subtitle}</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-card"><Settings size={22} aria-hidden="true" /></div>
        </div>
      </section>

      {loadError ? <p className="rounded-panel border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{t.loadErrorPrefix} {loadError.message}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Languages className="text-primary" size={20} aria-hidden="true" />
            <h2 className="text-xl font-black text-ink">{t.preferences}</h2>
          </div>
          <SettingsForm
            locale={locale}
            currency={profile?.currency ?? "THB"}
            financialCycleStartDay={profile?.financial_cycle_start_day ?? 25}
            bonusMonths={appSettings?.bonus_months ?? [4, 12]}
            defaultAccountId={appSettings?.default_account_id ?? null}
            accounts={accounts}
          />
        </div>

        <div className="grid gap-4">
          <article className="rounded-panel border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <Smartphone className="text-primary" size={20} aria-hidden="true" />
              <h2 className="text-xl font-black text-ink">{t.pwaTitle}</h2>
            </div>
            <p className="text-sm font-semibold text-muted">{t.pwaText}</p>
            <div className="mt-4 grid gap-2 text-sm font-bold text-muted">
              <p className="rounded-2xl bg-slate-50 p-3">{t.pwaManifest}</p>
              <p className="rounded-2xl bg-slate-50 p-3">{t.pwaTheme}</p>
              <p className="rounded-2xl bg-slate-50 p-3">{t.pwaOffline}</p>
            </div>
          </article>

          <article className="rounded-panel border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="text-primary" size={20} aria-hidden="true" />
              <h2 className="text-xl font-black text-ink">{t.versionTitle}</h2>
            </div>
            <div className="grid gap-2 text-sm font-bold text-muted">
              <p className="rounded-2xl bg-slate-50 p-3">{t.phase}</p>
              <p className="rounded-2xl bg-slate-50 p-3">{t.privateApp}</p>
              <p className="rounded-2xl bg-slate-50 p-3">{user?.email ?? "Private user"}</p>
            </div>
          </article>

          <article className="rounded-panel border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="text-primary" size={20} aria-hidden="true" />
              <h2 className="text-xl font-black text-ink">{t.privateAccessTitle}</h2>
            </div>
            <p className="mb-4 text-sm font-semibold text-muted">{t.privateAccessText}</p>
            <div className="flex items-center gap-3">
              <LogOut className="text-rose-600" size={20} aria-hidden="true" />
              <LogoutButton label={t.logout} />
            </div>
          </article>

          <article className="rounded-panel border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <WalletCards className="text-primary" size={20} aria-hidden="true" />
              <h2 className="text-xl font-black text-ink">{t.dailyPolishTitle}</h2>
            </div>
            <p className="text-sm font-semibold text-muted">{t.dailyPolishText}</p>
          </article>
        </div>
      </section>
    </div>
  );
}

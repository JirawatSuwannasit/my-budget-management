"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BellRing, CreditCard, Landmark, LayoutDashboard, LineChart, ListChecks, Settings, Tag, WalletCards, X } from "lucide-react";
import { processDueSubscriptionCharges } from "@/app/(private)/planning/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/browser";

function getNavItems(locale: Locale) {
  const nav = dictionaries[locale].nav;
  return [
    { href: "/dashboard", label: nav.dashboard, short: nav.shortDashboard, icon: LayoutDashboard },
    { href: "/accounts", label: nav.accounts, short: nav.shortAccounts, icon: WalletCards },
    { href: "/transactions", label: nav.transactions, short: nav.shortTransactions, icon: ListChecks },
    { href: "/planning", label: nav.planning, short: nav.shortPlanning, icon: BarChart3 },
    { href: "/categories", label: nav.categories, short: nav.shortCategories, icon: Tag },
    { href: "/debts-cards", label: nav.debtsCards, short: nav.shortDebtsCards, icon: CreditCard },
    { href: "/upcoming", label: nav.upcoming, short: nav.shortUpcoming, icon: BellRing },
    { href: "/reports", label: nav.reports, short: nav.shortReports, icon: LineChart },
    { href: "/settings", label: nav.settings, short: nav.shortSettings, icon: Settings }
  ];
}

export function AppShell({ children, userEmail, locale, badges = {} }: Readonly<{ children: ReactNode; userEmail: string; locale: Locale; badges?: Record<string, number> }>) {
  const pathname = usePathname();
  const dictionary = dictionaries[locale];
  const navItems = getNavItems(locale);
  const hasTriggeredCharges = useRef(false);
  const [autoChargedCount, setAutoChargedCount] = useState(0);

  // Lazy materialization: no scheduler exists in this stack, so due subscription
  // charges are posted once per app-shell mount instead. Fire-and-forget; the
  // server action revalidates the finance views itself on success.
  useEffect(() => {
    if (hasTriggeredCharges.current) return;
    hasTriggeredCharges.current = true;
    processDueSubscriptionCharges()
      .then((result) => {
        if (result.charged > 0) setAutoChargedCount(result.charged);
      })
      .catch(() => {});
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-dvh pb-24 text-ink md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-canvas shadow-card"><Landmark size={20} aria-hidden="true" /></span>
            <span>
              <span className="block text-sm font-black leading-tight">Finance Control</span>
              <span className="block text-xs font-semibold text-muted">{userEmail}</span>
            </span>
          </Link>
          <button onClick={signOut} className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">{dictionary.nav.signOut}</button>
        </div>
      </header>

      {autoChargedCount > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-income/20 bg-income/10 px-4 py-2.5 text-xs font-bold text-income">
            <span>{dictionary.nav.autoChargedNote.replace("{count}", String(autoChargedCount))}</span>
            <button onClick={() => setAutoChargedCount(0)} aria-label={dictionary.nav.dismiss} className="text-income/70 transition hover:text-income">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 grid gap-2 rounded-panel border border-line bg-surface/82 p-3 shadow-card backdrop-blur">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const badge = badges[item.href] ?? 0;
              return (
                <Link key={item.href} href={item.href} className={"flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition " + (active ? "bg-primary text-canvas" : "text-muted hover:bg-primary/10 hover:text-primary")}>
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                  {badge > 0 ? <span className={"ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-black " + (active ? "bg-surface text-primary" : "bg-rose-500 text-white")} aria-label={badge + " " + dictionary.upcoming.itemsSuffix}>{badge}</span> : null}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/94 px-3 pt-2 shadow-[0_-12px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-9 gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const badge = badges[item.href] ?? 0;
            return (
              <Link key={item.href} href={item.href} className={"relative grid min-h-14 place-items-center gap-0.5 rounded-2xl px-0.5 text-[0.58rem] font-black transition " + (active ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25" : "text-muted hover:text-ink")}>
                {badge > 0 ? <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[0.55rem] font-black text-white" aria-label={badge + " " + dictionary.upcoming.itemsSuffix}>{badge}</span> : null}
                <Icon size={18} aria-hidden="true" />
                <span>{item.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

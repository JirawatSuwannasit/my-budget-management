"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, Landmark, LayoutDashboard, LineChart, ListChecks, Settings, Tag, WalletCards } from "lucide-react";
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
    { href: "/reports", label: nav.reports, short: nav.shortReports, icon: LineChart },
    { href: "/settings", label: nav.settings, short: nav.shortSettings, icon: Settings }
  ];
}

export function AppShell({ children, userEmail, locale }: Readonly<{ children: ReactNode; userEmail: string; locale: Locale }>) {
  const pathname = usePathname();
  const dictionary = dictionaries[locale];
  const navItems = getNavItems(locale);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-dvh pb-24 text-ink md:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-canvas/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-white shadow-card"><Landmark size={20} aria-hidden="true" /></span>
            <span>
              <span className="block text-sm font-black leading-tight">Finance Control</span>
              <span className="block text-xs font-semibold text-muted">{userEmail}</span>
            </span>
          </Link>
          <button onClick={signOut} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">{dictionary.nav.signOut}</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 grid gap-2 rounded-panel border border-slate-200 bg-white/82 p-3 shadow-card backdrop-blur">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={"flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition " + (active ? "bg-primary text-white" : "text-muted hover:bg-primary/10 hover:text-primary")}>
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/94 px-3 pt-2 shadow-[0_-12px_30px_rgba(23,32,28,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-8 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={"grid min-h-14 place-items-center rounded-2xl px-1 text-[0.62rem] font-black transition " + (active ? "bg-primary/10 text-primary" : "text-muted")}>
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

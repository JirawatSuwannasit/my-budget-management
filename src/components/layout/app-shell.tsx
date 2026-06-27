"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, Landmark, LayoutDashboard, ListChecks, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

const navItems = [
  { href: "/dashboard", label: "หน้าหลัก", short: "Home", icon: LayoutDashboard },
  { href: "/dashboard#transactions", label: "รายการ", short: "Txns", icon: ListChecks },
  { href: "/dashboard#budgets", label: "งบ", short: "Budget", icon: BarChart3 },
  { href: "/dashboard#cards", label: "บัตร", short: "Cards", icon: CreditCard },
  { href: "/dashboard#settings", label: "ตั้งค่า", short: "More", icon: Settings }
];

export function AppShell({ children, userEmail }: Readonly<{ children: React.ReactNode; userEmail: string }>) {
  const pathname = usePathname();

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
          <button onClick={signOut} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">Logout</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 grid gap-2 rounded-panel border border-slate-200 bg-white/82 p-3 shadow-card backdrop-blur">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition " +
                  (active ? "bg-primary text-white" : "text-muted hover:bg-primary/10 hover:text-primary")
                }>
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
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={
                "grid min-h-14 place-items-center rounded-2xl px-1 text-[0.68rem] font-black transition " +
                (active ? "bg-primary/10 text-primary" : "text-muted")
              }>
                <Icon size={19} aria-hidden="true" />
                <span>{item.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

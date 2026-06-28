import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Banknote, CalendarDays, CircleDollarSign, CreditCard, Landmark, PiggyBank, Plus, ShieldCheck, TrendingUp, WalletCards } from "lucide-react";
import type { FinancialCycle } from "@/lib/finance/cycle";
import type { DashboardInput, DashboardSnapshot } from "@/lib/finance/types";
import type { UpcomingSummary } from "@/lib/finance/upcoming";
import { UpcomingPanel } from "@/components/upcoming/upcoming-ui";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

type DashboardShellProps = {
  cycle: FinancialCycle;
  salaryPaymentDate: Date;
  input: DashboardInput;
  snapshot: DashboardSnapshot;
  upcoming: UpcomingSummary;
  source: "supabase" | "demo";
  status: "ready" | "empty" | "error";
  notices: string[];
  errorMessage?: string;
  locale: Locale;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function StatCard({ label, value, tone = "neutral", icon: Icon }: { label: string; value: string; tone?: "neutral" | "income" | "warning" | "danger" | "success"; icon: ComponentType<{ size?: number; className?: string }> }) {
  const toneClass = {
    neutral: "bg-white text-ink border-slate-200",
    income: "bg-emerald-50 text-emerald-800 border-emerald-100",
    warning: "bg-amber-50 text-amber-800 border-amber-100",
    danger: "bg-rose-50 text-rose-800 border-rose-100",
    success: "bg-teal-50 text-teal-800 border-teal-100"
  }[tone];

  return (
    <div className={"rounded-panel border p-4 shadow-card " + toneClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-normal opacity-70">{label}</p>
        <Icon size={18} className="opacity-75" aria-hidden="true" />
      </div>
      <p className="break-words text-2xl font-black leading-none">{value}</p>
    </div>
  );
}

function ProgressRow({ label, used, total, detail, color = "bg-primary" }: { label: string; used: number; total: number; detail?: string; color?: string }) {
  const rawPercent = total <= 0 ? 0 : Math.round((used / total) * 100);
  const percent = Math.max(0, Math.min(100, rawPercent));
  const overspent = used > total;
  const barColor = overspent ? "bg-rose-500" : rawPercent >= 85 ? "bg-amber-500" : color;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-4 text-sm font-bold text-ink">
        <span>{label}</span>
        <span className={overspent ? "text-rose-700" : undefined}>{rawPercent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={"h-full rounded-full " + barColor} style={{ width: percent + "%" }} />
      </div>
      {detail ? <p className={"text-xs font-bold " + (overspent ? "text-rose-700" : "text-muted")}>{detail}</p> : null}
    </div>
  );
}

export function DashboardShell({ cycle, salaryPaymentDate, input, snapshot, upcoming, source, status, notices, errorMessage, locale }: DashboardShellProps) {
  const t = dictionaries[locale].dashboard;
  const dailyAvailable = cycle.daysRemaining > 0 ? snapshot.realAvailableMoney / cycle.daysRemaining : snapshot.realAvailableMoney;
  const sourceLabel = source === "supabase" ? t.sourceSupabase : t.sourceDemo;
  const sinkingFunds = input.sinkingFundReserves.map((fund) => ({
    ...fund,
    used: fund.reservedThisCycle ? fund.monthlyReserve : 0
  }));

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-white via-teal-50 to-blue-50 p-5 shadow-soft md:p-8">
        <div className="mb-4 grid gap-2">
          <div className={"w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-normal " + (source === "supabase" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{sourceLabel}</div>
          {notices.map((notice) => (
            <p key={notice} className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-muted">{notice}</p>
          ))}
          {status === "error" && errorMessage ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">Supabase error: {errorMessage}</p>
          ) : null}
          {status === "empty" ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{locale === "th" ? "เพิ่มบัญชี subscription งบ หนี้ statement บัตร หรือรายการเงิน เพื่อใช้ข้อมูลจริงแทนข้อมูลตัวอย่าง" : "Add accounts, subscriptions, budgets, debts, card statements, or transactions to replace this demo dashboard with real private data."}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">{t.cycleBadge}</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted shadow-card">{cycle.label}</span>
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight text-ink md:text-5xl">{t.realAvailable}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">{t.subtitle}</p>
          </div>
          <div className="rounded-3xl bg-ink p-5 text-white shadow-soft md:min-w-80">
            <p className="text-sm font-bold text-white/65">{t.realAvailableCard}</p>
            <p className="mt-2 text-4xl font-black leading-none md:text-5xl">{formatMoney(snapshot.realAvailableMoney)}</p>
            <p className="mt-4 text-sm text-white/70">{t.dailySafeAmount}: <strong className="text-white">{formatMoney(dailyAvailable)}</strong></p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.cashLike} value={formatMoney(snapshot.cashLikeBalance)} icon={WalletCards} tone="success" />
        <StatCard label={t.cycleIncome} value={formatMoney(snapshot.cycleIncome)} icon={ArrowDownLeft} tone="income" />
        <StatCard label={t.investmentTracking} value={formatMoney(snapshot.investmentTransfersThisCycle)} icon={TrendingUp} tone="neutral" />
        <StatCard label={t.dailyAvailable} value={formatMoney(dailyAvailable)} icon={CircleDollarSign} tone="success" />
      </section>

      <UpcomingPanel summary={upcoming} locale={locale} />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-card md:p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-normal text-muted">{t.reservedBeforeSpending}</p>
              <h2 className="mt-1 text-xl font-black text-ink">{t.availableBreakdown}</h2>
            </div>
            <ShieldCheck className="text-primary" size={24} aria-hidden="true" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label={t.unpaidObligations} value={formatMoney(snapshot.unpaidObligations)} icon={ArrowUpRight} tone="warning" />
            <StatCard label={t.cardPayable} value={formatMoney(snapshot.remainingCreditCardPayable)} icon={CreditCard} tone="danger" />
            <StatCard label={t.plannedDebt} value={formatMoney(snapshot.plannedDebtPayments)} icon={Landmark} tone="danger" />
            <StatCard label={t.sinkingFunds} value={formatMoney(snapshot.monthlySinkingFundReserves)} icon={PiggyBank} tone="warning" />
            <StatCard label={t.reservedBudgets} value={formatMoney(snapshot.unspentReservedBudgets)} icon={Banknote} tone="neutral" />
            <StatCard label={t.investmentAccountBalance} value={formatMoney(snapshot.investmentBalance)} icon={TrendingUp} tone="neutral" />
          </div>
        </div>

        <div className="grid gap-4">
          <div id="cards" className="rounded-panel border border-slate-200 bg-white p-4 shadow-card md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-muted">{t.cardLifecycle}</p>
                <h2 className="mt-1 text-xl font-black text-ink">{t.cardLifecycleTitle}</h2>
              </div>
              <CreditCard className="text-cardpay" size={24} aria-hidden="true" />
            </div>
            <div className="grid gap-3 text-sm font-semibold text-muted">
              <p>{t.cardLifecycleText1}</p>
              <p>{t.cardLifecycleText2}</p>
              <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
                {t.currentCardSpending}: <strong>{formatMoney(snapshot.currentCardCycleSpending)}</strong><br />
                {t.remainingStatementPayable}: <strong>{formatMoney(snapshot.remainingCreditCardPayable)}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-card md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-muted">{t.financialCycle}</p>
                <h2 className="mt-1 text-xl font-black text-ink">{t.salaryAssignment}</h2>
              </div>
              <CalendarDays className="text-primary" size={24} aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-muted">{t.salaryTextPrefix} {formatDate(cycle.start)}. {t.salaryTextMiddle} {formatDate(salaryPaymentDate)} {t.salaryTextSuffix}</p>
          </div>
        </div>
      </section>

      <section id="budgets" className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-muted">{t.budgetReservePacing}</p>
            <h2 className="mt-1 text-xl font-black text-ink">{t.budgetSinkingTitle}</h2>
          </div>
          <Link href="/planning" className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white shadow-card" aria-label={t.budgetSinkingTitle}><Plus size={20} aria-hidden="true" /></Link>
        </div>
        {input.reservedBudgets.length === 0 && sinkingFunds.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-muted">{t.noBudgets}</p>
        ) : null}
        {input.reservedBudgets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {input.reservedBudgets.map((budget) => {
              const remaining = budget.budgetAmount - budget.usedAmount;
              const daily = Math.max(0, remaining) / Math.max(1, cycle.daysRemaining);
              return (
                <ProgressRow
                  key={budget.id}
                  label={budget.label}
                  used={budget.usedAmount}
                  total={budget.budgetAmount}
                  detail={t.remaining + " " + formatMoney(remaining) + " - " + t.dailyAverage + " " + formatMoney(daily)}
                />
              );
            })}
          </div>
        ) : null}
        {sinkingFunds.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sinkingFunds.map((fund) => (
              <ProgressRow
                key={fund.id}
                label={fund.label}
                used={fund.used}
                total={fund.monthlyReserve}
                detail={(fund.reservedThisCycle ? t.reservedDone + " " : t.stillNeedReserve + " ") + formatMoney(fund.monthlyReserve)}
                color="bg-emerald-600"
              />
            ))}
          </div>
        ) : null}
      </section>

      <section id="transactions" className="rounded-panel border border-dashed border-slate-300 bg-white/72 p-5 text-sm font-semibold text-muted">
        {source === "supabase" ? t.dashboardSourceLive : t.dashboardSourceDemo}
      </section>

      <section id="settings" className="rounded-panel border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-xl font-black text-ink">{t.settingsFoundation}</h2>
        <p className="mt-2 text-sm font-semibold text-muted">{t.settingsFoundationText}</p>
      </section>
    </div>
  );
}

import Link from "next/link";
import { BarChart3, CreditCard, Lock, PiggyBank, Plus, ShieldCheck } from "lucide-react";
import type { FinancialCycle } from "@/lib/finance/cycle";
import type { DashboardInput, DashboardSnapshot } from "@/lib/finance/types";
import type { UpcomingSummary } from "@/lib/finance/upcoming";
import { UpcomingPanel } from "@/components/upcoming/upcoming-ui";
import { Card, SectionHeader, StatBlock, buttonClass } from "@/components/ui";
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

// When real-available falls below this many days of safe spend it reads "tight".
// Tweak here to change the warning threshold.
const SAFE_BUFFER_DAYS = 3;

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(value);
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
        <span className={overspent ? "text-danger" : undefined}>{rawPercent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
        <div className={"h-full rounded-full " + barColor} style={{ width: percent + "%" }} />
      </div>
      {detail ? <p className={"text-xs font-bold " + (overspent ? "text-danger" : "text-muted")}>{detail}</p> : null}
    </div>
  );
}

export function DashboardShell({ cycle, input, snapshot, upcoming, source, status, notices, errorMessage, locale }: DashboardShellProps) {
  const t = dictionaries[locale].dashboard;
  const real = snapshot.realAvailableMoney;
  const dailyAvailable = cycle.daysRemaining > 0 ? real / cycle.daysRemaining : real;
  const netAfterCard = real - snapshot.currentCardCycleSpending;

  // One-word status cue derived from the numbers (color via existing tones).
  const health = real <= 0 ? "danger" : real < dailyAvailable * SAFE_BUFFER_DAYS ? "warning" : "healthy";
  const healthLabel = health === "danger" ? t.statusDanger : health === "warning" ? t.statusWarning : t.statusHealthy;
  const healthChip = health === "danger" ? "bg-danger/15 text-danger" : health === "warning" ? "bg-warning/15 text-warning" : "bg-income/15 text-income";
  const healthText = health === "danger" ? "text-danger" : health === "warning" ? "text-warning" : "text-income";

  const sourceLabel = source === "supabase" ? t.sourceSupabase : t.sourceDemo;
  const sinkingFunds = input.sinkingFundReserves.map((fund) => ({
    ...fund,
    used: fund.reservedThisCycle ? fund.monthlyReserve : 0
  }));
  const usableBudgetRemaining = input.reservedBudgets.reduce((sum, b) => sum + (b.budgetAmount - b.usedAmount), 0);

  return (
    <div className="grid gap-5">
      {/* 1. HERO — the answer */}
      <section className="overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-elevated via-surface to-surface p-5 shadow-glow md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-caption font-black uppercase text-primary">{t.cycleBadge}</span>
          <span className="rounded-full bg-surface px-3 py-1 text-caption font-black text-muted shadow-card">{cycle.label}</span>
          <span className={"rounded-full px-3 py-1 text-caption font-black uppercase " + (source === "supabase" ? "bg-income/15 text-income" : "bg-warning/15 text-warning")}>{sourceLabel}</span>
          <span className={"ml-auto rounded-full px-3 py-1 text-caption font-black uppercase " + healthChip}>{healthLabel}</span>
        </div>

        <p className="mt-5 text-caption font-black uppercase text-primary">{t.realAvailable}</p>
        <p className="mt-1 font-display text-display font-black leading-none tabular-nums text-ink md:text-display-lg">{formatMoney(real)}</p>
        {snapshot.currentCardCycleSpending !== 0 ? (
          <p className="mt-3 text-sm font-semibold text-muted">{t.netAfterCard}: <strong className={"tabular-nums " + (netAfterCard <= 0 ? "text-danger" : "text-ink")}>{formatMoney(netAfterCard)}</strong></p>
        ) : null}
        <p className="mt-3 text-sm font-semibold text-muted">{t.dailySafeAmount}: <strong className={"tabular-nums " + healthText}>{formatMoney(dailyAvailable)}</strong></p>

        {status === "error" ? (
          <p className="mt-4 text-xs font-bold text-danger">{t.errorPrefix} {errorMessage}</p>
        ) : notice ? (
          <p className="mt-4 text-xs font-semibold text-muted">{notice}</p>
        ) : null}
      </section>

      {/* 2. QUICK ACTIONS */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link key={index} href={action.href} className={buttonClass("ghost", "h-auto min-h-16 flex-col gap-1.5 !px-2 py-3 text-xs")}>
              <Icon size={20} aria-hidden="true" />
              <span className="text-center leading-tight">{action.label}</span>
            </Link>
          );
        })}
      </section>

      {/* 5. UPCOMING — what's due */}
      <UpcomingPanel summary={upcoming} locale={locale} />

      {/* 3. SAFE-TO-SPEND WATERFALL — how we reach the answer */}
      <Card>
        <SectionHeader icon={ShieldCheck} eyebrow={t.reservedBeforeSpending} title={t.availableBreakdown} />
        <div className="mt-4 grid gap-1">
          <div className="flex items-center justify-between gap-3 border-b border-line/60 py-2.5 text-sm font-bold text-ink">
            <span>{t.cashLike}</span>
            <span className="tabular-nums text-ink">{formatMoney(snapshot.cashLikeBalance)}</span>
          </div>
          {waterfall.map((step, index) => (
            <div key={index} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="font-bold text-muted">{step.label}</span>
              <span className="flex items-baseline gap-3">
                <span className={"tabular-nums font-bold " + step.toneText}>−{formatMoney(step.value)}</span>
                <span className="w-24 text-right tabular-nums font-semibold text-faint">{formatMoney(step.running)}</span>
              </span>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between gap-3 rounded-2xl bg-elevated px-3 py-3">
            <span className="text-sm font-black text-ink">{t.realAvailable}</span>
            <span className={"font-display text-stat font-black tabular-nums " + healthText}>{formatMoney(real)}</span>
          </div>
          {snapshot.currentCardCycleSpending > 0 ? (
            <>
              <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-bold text-muted">{t.cardFloatingThisCycle}</span>
                <span className="flex items-baseline gap-3">
                  <span className="tabular-nums font-bold text-warning">−{formatMoney(snapshot.currentCardCycleSpending)}</span>
                  <span className="w-24 text-right tabular-nums font-semibold text-faint">{formatMoney(netAfterCard)}</span>
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 rounded-2xl bg-elevated px-3 py-3">
                <span className="text-sm font-black text-ink">{t.netAfterCard}</span>
                <span className={"font-display text-stat font-black tabular-nums " + (netAfterCard <= 0 ? "text-danger" : "text-ink")}>{formatMoney(netAfterCard)}</span>
              </div>
            </>
          ) : null}
        </div>
      </Card>

      {/* 4. SET ASIDE — money intentionally excluded from spendable */}
      <Card>
        <SectionHeader icon={Lock} eyebrow={t.setAsideHint} title={t.setAsideTitle} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <StatBlock label={t.savingsBalance} value={formatMoney(snapshot.savingsBalance)} icon={PiggyBank} tone="neutral" />
          <StatBlock label={t.investmentAccountBalance} value={formatMoney(snapshot.investmentBalance)} icon={BarChart3} tone="investment" />
        </div>
      </Card>

      {/* 6. BUDGET & SINKING-FUND PACING */}
      <section id="budgets" className="grid gap-4 rounded-panel border border-line bg-surface p-4 shadow-card md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-muted">{t.budgetReservePacing}</p>
            <h2 className="mt-1 text-xl font-black text-ink">{t.budgetSinkingTitle}</h2>
          </div>
          <Link href="/planning" className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-canvas shadow-card" aria-label={t.budgetSinkingTitle}><Plus size={20} aria-hidden="true" /></Link>
        </div>
        {input.reservedBudgets.length > 0 ? (
          <div className="flex items-center justify-between gap-4 text-sm font-bold">
            <span className="text-muted">{t.usableBudgetRemaining}</span>
            <span className={usableBudgetRemaining < 0 ? "text-danger" : "text-ink"}>{formatMoney(usableBudgetRemaining)}</span>
          </div>
        ) : null}
        {input.reservedBudgets.length === 0 && sinkingFunds.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-elevated p-4 text-sm font-bold text-muted">{t.noBudgets}</p>
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
    </div>
  );
}

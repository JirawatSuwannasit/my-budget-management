import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CalendarRange, Landmark, LineChart, Minus, Percent, PieChart, Scale, ShieldCheck, Tag, TrendingDown, TrendingUp } from "lucide-react";
import type { ReportsData } from "@/lib/finance/reports";
import { deriveReportInsights, savingsRateFor } from "@/lib/finance/reports-insights";
import { Card, SectionHeader, StatBlock, type StatBlockTone } from "@/components/ui";
import { CATEGORY_PALETTE } from "@/components/reports/chart-colors";
import { CategoryDonut, DebtTrajectoryChart, SavingsRateChart, TrendChart } from "@/components/reports/reports-charts";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

type ReportsViewProps = {
  locale: Locale;
  data: ReportsData | null;
  hasRows: boolean;
  loadError: string | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 }).format(value);
}

// spendTrend.percent already arrives in percentage-point units (not a 0..1 fraction).
function formatPercentPoints(value: number) {
  return Math.round(value) + "%";
}

function formatCycleChip(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(date);
}

// Short axis tick, e.g. "Jul '26" — compact enough for several ticks on a 390px screen.
function shortAxisLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date) + " '" + String(date.getFullYear()).slice(-2);
}

export function ReportsView({ locale, data, hasRows, loadError }: ReportsViewProps) {
  const t = dictionaries[locale].reports;

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-elevated via-surface to-surface p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">{t.phase}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-income/15 px-3 py-1 text-xs font-black uppercase tracking-normal text-income"><ShieldCheck size={13} aria-hidden="true" />{t.readOnly}</span>
            </div>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">{t.subtitle}</p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-canvas shadow-card"><LineChart size={22} aria-hidden="true" /></div>
        </div>
        <p className="mt-4 rounded-2xl border border-line bg-surface/80 px-4 py-3 text-sm font-bold text-muted">{t.readOnlyNote}</p>
      </section>

      {loadError ? <p className="rounded-panel border border-danger/30 bg-danger/10 p-4 text-sm font-bold text-danger">{t.loadError}: {loadError}</p> : null}

      {!loadError && (!data || !hasRows) ? (
        <section className="rounded-panel border border-dashed border-line bg-surface/80 p-8 text-center shadow-card">
          <h2 className="text-xl font-black text-ink">{t.emptyTitle}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold text-muted">{t.emptyText}</p>
        </section>
      ) : null}

      {!loadError && data && hasRows ? <ReportsBody locale={locale} data={data} /> : null}
    </div>
  );
}

function ReportsBody({ locale, data }: { locale: Locale; data: ReportsData }) {
  const t = dictionaries[locale].reports;
  const insights = deriveReportInsights(data);

  // cycles arrive most-recent-first; charts read left-to-right chronologically.
  const chronological = [...data.cycles].reverse();
  const hasTrend = chronological.some((cycle) => cycle.income > 0 || cycle.expenses > 0);

  const trendData = chronological.map((cycle) => ({
    cycleStartDate: cycle.cycleStartDate,
    axisLabel: shortAxisLabel(cycle.start),
    fullLabel: formatCycleChip(cycle.start),
    income: cycle.income,
    expenses: cycle.expenses,
    net: cycle.net
  }));

  const savingsData = chronological.map((cycle) => ({
    cycleStartDate: cycle.cycleStartDate,
    axisLabel: shortAxisLabel(cycle.start),
    fullLabel: formatCycleChip(cycle.start),
    ratePercent: Math.round(savingsRateFor(cycle.income, cycle.net) * 1000) / 10
  }));

  const hasDebt = data.debtTrajectory.some((point) => point.remaining > 0);
  const latestRemaining = data.debtTrajectory[data.debtTrajectory.length - 1]?.remaining ?? 0;
  const debtChartData = data.debtTrajectory.map((point) => ({
    cycleStartDate: point.cycleStartDate,
    axisLabel: shortAxisLabel(point.start),
    fullLabel: formatCycleChip(point.start),
    remaining: point.remaining
  }));

  const netTone: StatBlockTone = insights.avgMonthlyNet >= 0 ? "income" : "expense";
  const spendTrend = insights.spendTrend;
  const SpendTrendIcon = spendTrend?.direction === "up" ? TrendingUp : spendTrend?.direction === "down" ? TrendingDown : Minus;
  const spendTrendTone: StatBlockTone = spendTrend?.direction === "up" ? "warning" : spendTrend?.direction === "down" ? "income" : "neutral";
  const spendTrendSign = spendTrend?.direction === "up" ? "+" : spendTrend?.direction === "down" ? "-" : "";
  const spendTrendDeltaLabel = spendTrend?.direction === "up" ? t.spendTrendUp : spendTrend?.direction === "down" ? t.spendTrendDown : t.spendTrendFlat;

  return (
    <>
      {/* Insights — one scannable number + short label per tile, only what the data supports. */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <StatBlock label={t.avgMonthlyIncome} value={formatMoney(insights.avgMonthlyIncome)} icon={ArrowDownLeft} tone="income" />
        <StatBlock label={t.avgMonthlyExpense} value={formatMoney(insights.avgMonthlyExpense)} icon={ArrowUpRight} tone="expense" />
        <StatBlock label={t.avgMonthlyNet} value={formatMoney(insights.avgMonthlyNet)} icon={Scale} tone={netTone} />
        <StatBlock
          label={t.currentSavingsRate}
          value={formatPercent(insights.currentSavingsRate)}
          icon={Percent}
          tone="primary"
          delta={{ value: t.avgLabel + " " + formatPercent(insights.avgSavingsRate), tone: "neutral" }}
        />
        {spendTrend ? (
          <StatBlock
            label={t.spendTrendLabel}
            value={spendTrendSign + formatPercentPoints(spendTrend.percent)}
            icon={SpendTrendIcon}
            tone={spendTrendTone}
            delta={{ value: spendTrendDeltaLabel, tone: spendTrendTone }}
          />
        ) : null}
        {insights.topCategoryLabel ? (
          <StatBlock
            label={t.topCategoryLabel}
            value={insights.topCategoryLabel}
            icon={Tag}
            tone="investment"
            delta={{ value: formatPercent(insights.topCategoryShare) + " " + t.topCategoryShareSuffix, tone: "neutral" }}
          />
        ) : null}
        {insights.totalDebtPaid > 0 ? (
          <StatBlock
            label={t.totalDebtPaidLabel}
            value={formatMoney(insights.totalDebtPaid)}
            icon={Landmark}
            tone="debt"
            delta={insights.debtProjection ? { value: t.estimatedPayoffLabel + " " + insights.debtProjection.projectedPayoffLabel + " " + t.estimateNote, tone: "neutral" } : undefined}
          />
        ) : null}
      </section>

      {/* Income vs expense vs net trend, and savings-rate trend. */}
      <Card>
        {hasTrend ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <SectionHeader icon={LineChart} title={t.incomeVsExpense} />
              <div className="mt-4"><TrendChart data={trendData} labels={{ income: t.income, expenses: t.expenses, net: t.net }} /></div>
            </div>
            <div>
              <SectionHeader icon={Percent} title={t.savingsRate} />
              <div className="mt-4"><SavingsRateChart data={savingsData} seriesLabel={t.savingsRate} /></div>
            </div>
          </div>
        ) : (
          <>
            <SectionHeader icon={LineChart} title={t.incomeVsExpense} />
            <p className="mt-4 rounded-2xl border border-dashed border-line bg-elevated p-4 text-sm font-bold text-muted">{t.noTrendData}</p>
          </>
        )}
      </Card>

      {/* Cycle history — compact, scannable table. */}
      <Card>
        <SectionHeader
          icon={CalendarRange}
          title={t.cycleHistory}
          action={<span className="rounded-full bg-surface px-3 py-1 text-xs font-black text-muted shadow-card">{data.cycles.length} {t.cyclesSuffix}</span>}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm sm:min-w-[560px]">
            <thead>
              <tr className="border-b border-line text-left text-caption font-black uppercase text-muted">
                <th className="py-2 pr-3 font-black">{t.tableCycleHeader}</th>
                <th className="px-3 py-2 text-right font-black">{t.income}</th>
                <th className="px-3 py-2 text-right font-black">{t.expenses}</th>
                <th className="px-3 py-2 text-right font-black">{t.net}</th>
                <th className="hidden px-3 py-2 text-right font-black sm:table-cell">{t.investmentTransfers}</th>
                <th className="hidden px-3 py-2 text-right font-black sm:table-cell">{t.debtPaid}</th>
                <th className="hidden px-3 py-2 text-right font-black sm:table-cell">{t.sinkingReserved}</th>
              </tr>
            </thead>
            <tbody>
              {data.cycles.map((cycle) => (
                <tr key={cycle.cycleStartDate} className={"border-b border-line/60 " + (cycle.isCurrent ? "bg-primary/5" : "")}>
                  <td className="py-2.5 pr-3 font-bold text-ink">
                    {formatCycleChip(cycle.start)}
                    {cycle.isCurrent ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-black uppercase text-primary">{t.currentCycle}</span> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-income">{formatMoney(cycle.income)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-danger">{formatMoney(cycle.expenses)}</td>
                  <td className={"px-3 py-2.5 text-right tabular-nums font-black " + (cycle.net >= 0 ? "text-income" : "text-danger")}>{formatMoney(cycle.net)}</td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-investment sm:table-cell">{formatMoney(cycle.investmentTransfers)}</td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-debt sm:table-cell">{formatMoney(cycle.debtPaid)}</td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-warning sm:table-cell">{formatMoney(cycle.sinkingReserved)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Category breakdown for the selected cycle — donut + ranked list, cycle chips select the cycle. */}
      <Card>
        <SectionHeader icon={PieChart} title={t.spendingByCategory} />
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-caption font-black uppercase text-muted">{t.selectCycle}</span>
          <div className="flex flex-wrap gap-2">
            {data.cycles.map((cycle) => {
              const selected = cycle.cycleStartDate === data.selectedCycleStartDate;
              return (
                <Link
                  key={cycle.cycleStartDate}
                  href={"/reports?cycle=" + cycle.cycleStartDate}
                  scroll={false}
                  className={"rounded-full px-3 py-1.5 text-xs font-black transition " + (selected ? "bg-primary text-canvas shadow-card" : "border border-line bg-surface text-muted hover:border-primary/40 hover:text-primary")}
                >
                  {formatCycleChip(cycle.start)}
                </Link>
              );
            })}
          </div>
        </div>
        {data.categoryBreakdown.slices.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-elevated p-4 text-sm font-bold text-muted">{t.noCategoryData}</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center">
            <CategoryDonut slices={data.categoryBreakdown.slices} centerLabel={t.totalExpenses} centerValue={formatMoney(data.categoryBreakdown.total)} />
            <div className="grid gap-3">
              {data.categoryBreakdown.slices.map((slice, index) => (
                <div key={(slice.categoryId ?? "other") + index} className="flex items-center justify-between gap-3 text-sm font-bold text-ink">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] }} aria-hidden="true" />
                    <span className="truncate">{slice.label}</span>
                  </span>
                  <span className="shrink-0 text-muted">{formatMoney(slice.amount)} · {formatPercent(slice.share)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Debt payoff trajectory. */}
      <Card>
        <SectionHeader icon={TrendingDown} title={t.debtTrajectory} />
        {hasDebt && data.debtTrajectory.length >= 2 ? (
          <>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-caption font-black uppercase text-muted">{t.remainingBalance}</p>
                <p className="mt-1 text-stat font-black tabular-nums text-ink">{formatMoney(latestRemaining)}</p>
              </div>
              {insights.debtProjection ? (
                <p className="max-w-xs text-right text-xs font-bold text-muted">
                  {t.estimatedPayoffLabel} <span className="font-black text-ink">{insights.debtProjection.projectedPayoffLabel}</span>
                  <br />
                  <span className="text-faint">{t.estimateNote}</span>
                </p>
              ) : null}
            </div>
            <div className="mt-3"><DebtTrajectoryChart data={debtChartData} seriesLabel={t.remainingBalance} /></div>
          </>
        ) : hasDebt ? (
          <div className="mt-4">
            <p className="text-caption font-black uppercase text-muted">{t.remainingBalance}</p>
            <p className="mt-1 text-stat font-black tabular-nums text-ink">{formatMoney(latestRemaining)}</p>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-elevated p-4 text-sm font-bold text-muted">{t.noDebtData}</p>
        )}
      </Card>
    </>
  );
}

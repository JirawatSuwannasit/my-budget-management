import Link from "next/link";
import { CalendarRange, LineChart, PieChart, ShieldCheck, TrendingDown } from "lucide-react";
import type { ReportsData } from "@/lib/finance/reports";
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

function formatCycleChip(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(date);
}

const BAR_COLORS = ["bg-primary", "bg-teal-500", "bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-indigo-500", "bg-slate-500", "bg-fuchsia-500"];

function SectionHeader({ icon: Icon, title }: { icon: typeof LineChart; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="text-primary" size={20} aria-hidden="true" />
      <h2 className="text-xl font-black text-ink">{title}</h2>
    </div>
  );
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
  const trendCycles = [...data.cycles].reverse();
  const trendMax = Math.max(1, ...trendCycles.map((cycle) => Math.max(cycle.income, cycle.expenses)));
  const debtMax = Math.max(1, ...data.debtTrajectory.map((point) => point.remaining));
  const hasDebt = data.debtTrajectory.some((point) => point.remaining > 0);
  const hasTrend = trendCycles.some((cycle) => cycle.income > 0 || cycle.expenses > 0);

  return (
    <>
      <section className="rounded-panel border border-line bg-surface p-5 shadow-card">
        <SectionHeader icon={LineChart} title={t.incomeVsExpense} />
        {hasTrend ? (
          <>
            <div className="flex items-end gap-1.5 overflow-hidden sm:gap-3" style={{ height: "180px" }}>
              {trendCycles.map((cycle) => (
                <div key={cycle.cycleStartDate} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" style={{ height: "150px" }}>
                  <div className="flex h-full w-full items-end justify-center gap-0.5">
                    <div className="w-1/2 rounded-t bg-emerald-500" style={{ height: Math.round((cycle.income / trendMax) * 100) + "%" }} aria-hidden="true" />
                    <div className="w-1/2 rounded-t bg-rose-400" style={{ height: Math.round((cycle.expenses / trendMax) * 100) + "%" }} aria-hidden="true" />
                  </div>
                  <span className="truncate text-[0.6rem] font-bold text-muted">{formatCycleChip(cycle.start)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-muted">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" aria-hidden="true" />{t.income}</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-400" aria-hidden="true" />{t.expenses}</span>
            </div>
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-line bg-elevated p-4 text-sm font-bold text-muted">{t.noTrendData}</p>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-4">
          <SectionHeader icon={CalendarRange} title={t.cycleHistory} />
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-black text-muted shadow-card">{data.cycles.length} {t.cyclesSuffix}</span>
        </div>
        <div className="grid gap-3">
          {data.cycles.map((cycle) => (
            <article key={cycle.cycleStartDate} className={"rounded-panel border p-4 shadow-card " + (cycle.isCurrent ? "border-primary/40 bg-primary/5" : "border-line bg-surface")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-black text-ink">{cycle.label}</h3>
                <div className="flex items-center gap-2">
                  {cycle.isCurrent ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{t.currentCycle}</span> : null}
                  <span className={"rounded-full px-2.5 py-1 text-xs font-black " + (cycle.net >= 0 ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}>{t.net} {formatMoney(cycle.net)}</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-bold sm:grid-cols-3 lg:grid-cols-5">
                <Metric label={t.income} value={formatMoney(cycle.income)} tone="text-income" />
                <Metric label={t.expenses} value={formatMoney(cycle.expenses)} tone="text-danger" />
                <Metric label={t.investmentTransfers} value={formatMoney(cycle.investmentTransfers)} tone="text-investment" />
                <Metric label={t.debtPaid} value={formatMoney(cycle.debtPaid)} tone="text-debt" />
                <Metric label={t.sinkingReserved} value={formatMoney(cycle.sinkingReserved)} tone="text-warning" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-panel border border-line bg-surface p-5 shadow-card">
          <SectionHeader icon={PieChart} title={t.spendingByCategory} />
          <div className="mb-4 flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-normal text-muted">{t.selectCycle}</span>
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
          <p className="mb-3 text-sm font-black text-ink">{t.totalExpenses}: {formatMoney(data.categoryBreakdown.total)}</p>
          {data.categoryBreakdown.slices.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-elevated p-4 text-sm font-bold text-muted">{t.noCategoryData}</p>
          ) : (
            <div className="grid gap-3">
              {data.categoryBreakdown.slices.map((slice, index) => (
                <div key={(slice.categoryId ?? "other") + index} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm font-bold text-ink">
                    <span className="min-w-0 truncate">{slice.label}</span>
                    <span className="shrink-0 text-muted">{formatMoney(slice.amount)} · {formatPercent(slice.share)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
                    <div className={"h-full rounded-full " + BAR_COLORS[index % BAR_COLORS.length]} style={{ width: Math.max(2, Math.round(slice.share * 100)) + "%" }} aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-panel border border-line bg-surface p-5 shadow-card">
          <SectionHeader icon={TrendingDown} title={t.debtTrajectory} />
          {hasDebt && data.debtTrajectory.length >= 2 ? (
            <DebtChart points={data.debtTrajectory} max={debtMax} />
          ) : hasDebt ? (
            <p className="text-2xl font-black text-ink">{formatMoney(data.debtTrajectory[data.debtTrajectory.length - 1]?.remaining ?? 0)}</p>
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-elevated p-4 text-sm font-bold text-muted">{t.noDebtData}</p>
          )}
          {hasDebt ? (
            <div className="mt-3 flex items-center justify-between text-xs font-bold text-muted">
              <span>{formatCycleChip(data.debtTrajectory[0]?.start ?? new Date())}</span>
              <span>{t.remainingBalance}</span>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-black uppercase tracking-normal text-muted">{label}</span>
      <span className={"text-sm font-black " + tone}>{value}</span>
    </div>
  );
}

function DebtChart({ points, max }: { points: ReportsData["debtTrajectory"]; max: number }) {
  const width = 100;
  const height = 40;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((point, index) => {
    const x = index * stepX;
    const y = height - (point.remaining / max) * (height - 4) - 2;
    return { x, y };
  });
  const linePoints = coords.map((coord) => coord.x.toFixed(2) + "," + coord.y.toFixed(2)).join(" ");
  const areaPoints = "0," + height + " " + linePoints + " " + width + "," + height;

  return (
    <svg viewBox={"0 0 " + width + " " + height} preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="debt payoff trajectory">
      <polygon points={areaPoints} fill="rgb(244 63 94 / 0.12)" />
      <polyline points={linePoints} fill="none" stroke="rgb(244 63 94)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((coord, index) => (
        <circle key={index} cx={coord.x} cy={coord.y} r={1.4} fill="rgb(244 63 94)" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

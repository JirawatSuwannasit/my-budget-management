"use client";

import type { TooltipContentProps } from "recharts";
import { Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORY_PALETTE, CHART_COLORS } from "./chart-colors";

// All props here are plain serializable values (numbers/strings) mapped by the
// server component — no Date objects or functions cross the server/client boundary.

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
}

function formatCompactMoney(value: number) {
  return "฿" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatPercentValue(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value) + "%";
}

function TooltipShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2 shadow-card">
      {title ? <p className="text-xs font-black text-ink">{title}</p> : null}
      <div className="mt-1 grid gap-1">{children}</div>
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-muted">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="truncate">{label}</span>
      <span className="ml-auto shrink-0 tabular-nums text-ink">{value}</span>
    </div>
  );
}

function LegendRow({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-muted">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

const AXIS_TICK = { fontSize: 11, fill: CHART_COLORS.axis };

// 1. Income vs expense vs net trend (grouped bars + a net line overlay).
export type TrendPoint = { cycleStartDate: string; axisLabel: string; fullLabel: string; income: number; expenses: number; net: number };

function TrendTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload as TrendPoint | undefined;
  return (
    <TooltipShell title={datum?.fullLabel}>
      {payload.map((entry, index) => (
        <TooltipRow key={index} color={entry.color ?? CHART_COLORS.axis} label={String(entry.name ?? "")} value={formatMoney(Number(entry.value ?? 0))} />
      ))}
    </TooltipShell>
  );
}

export function TrendChart({ data, labels }: { data: TrendPoint[]; labels: { income: string; expenses: string; net: string } }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="axisLabel" tick={AXIS_TICK} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={52} tickFormatter={formatCompactMoney} />
          <Tooltip content={TrendTooltip} cursor={{ fill: CHART_COLORS.grid }} />
          <Bar dataKey="income" name={labels.income} fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expenses" name={labels.expenses} fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Line dataKey="net" name={labels.net} stroke={CHART_COLORS.net} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.net, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
      <LegendRow items={[{ label: labels.income, color: CHART_COLORS.income }, { label: labels.expenses, color: CHART_COLORS.expense }, { label: labels.net, color: CHART_COLORS.net }]} />
    </div>
  );
}

// 2. Savings-rate trend (net / income per cycle).
export type SavingsRatePoint = { cycleStartDate: string; axisLabel: string; fullLabel: string; ratePercent: number };

function SavingsTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload as SavingsRatePoint | undefined;
  return (
    <TooltipShell title={datum?.fullLabel}>
      <TooltipRow color={CHART_COLORS.net} label={String(payload[0]?.name ?? "")} value={formatPercentValue(Number(payload[0]?.value ?? 0))} />
    </TooltipShell>
  );
}

export function SavingsRateChart({ data, seriesLabel }: { data: SavingsRatePoint[]; seriesLabel: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="savingsRateFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.net} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.net} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="axisLabel" tick={AXIS_TICK} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} tickFormatter={(value: number) => value + "%"} />
        <ReferenceLine y={0} stroke={CHART_COLORS.grid} />
        <Tooltip content={SavingsTooltip} cursor={{ stroke: CHART_COLORS.grid }} />
        <Area type="monotone" dataKey="ratePercent" name={seriesLabel} stroke={CHART_COLORS.net} strokeWidth={2.5} fill="url(#savingsRateFill)" dot={{ r: 3, fill: CHART_COLORS.net, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// 3. Category breakdown donut for the selected cycle.
export type CategoryChartSlice = { categoryId: string | null; label: string; amount: number; share: number };

export function CategoryDonut({ slices, centerLabel, centerValue }: { slices: CategoryChartSlice[]; centerLabel: string; centerValue: string }) {
  function CategoryTooltip({ active, payload }: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null;
    const entry = payload[0];
    const datum = entry?.payload as CategoryChartSlice | undefined;
    if (!datum) return null;
    const index = slices.findIndex((slice) => slice.label === datum.label && slice.amount === datum.amount);
    const color = CATEGORY_PALETTE[(index < 0 ? 0 : index) % CATEGORY_PALETTE.length];
    return (
      <TooltipShell>
        <TooltipRow color={color} label={datum.label} value={formatMoney(datum.amount) + " · " + formatPercentValue(datum.share * 100)} />
      </TooltipShell>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Tooltip content={CategoryTooltip} />
          <Pie data={slices} dataKey="amount" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={slices.length > 1 ? 2 : 0} stroke="none">
            {slices.map((slice, index) => (
              <Cell key={slice.categoryId ?? slice.label} fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-caption font-black uppercase text-muted">{centerLabel}</span>
        <span className="mt-1 text-sm font-black tabular-nums text-ink">{centerValue}</span>
      </div>
    </div>
  );
}

// 4. Debt payoff trajectory (area + line).
export type DebtChartPoint = { cycleStartDate: string; axisLabel: string; fullLabel: string; remaining: number };

function DebtTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload as DebtChartPoint | undefined;
  return (
    <TooltipShell title={datum?.fullLabel}>
      <TooltipRow color={CHART_COLORS.debt} label={String(payload[0]?.name ?? "")} value={formatMoney(Number(payload[0]?.value ?? 0))} />
    </TooltipShell>
  );
}

export function DebtTrajectoryChart({ data, seriesLabel }: { data: DebtChartPoint[]; seriesLabel: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="debtTrajectoryFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.debt} stopOpacity={0.32} />
            <stop offset="100%" stopColor={CHART_COLORS.debt} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="axisLabel" tick={AXIS_TICK} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={52} tickFormatter={formatCompactMoney} />
        <Tooltip content={DebtTooltip} cursor={{ stroke: CHART_COLORS.grid }} />
        <Area type="monotone" dataKey="remaining" name={seriesLabel} stroke={CHART_COLORS.debt} strokeWidth={2.5} fill="url(#debtTrajectoryFill)" dot={{ r: 3, fill: CHART_COLORS.debt, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

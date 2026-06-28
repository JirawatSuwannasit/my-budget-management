import type { createClient } from "@/lib/supabase/server";

export type FinancialCycle = {
  start: Date;
  end: Date;
  label: string;
  daysRemaining: number;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export const DEFAULT_CYCLE_START_DAY = 25;
const MIN_CYCLE_START_DAY = 1;
const MAX_CYCLE_START_DAY = 28;

function atLocalNoon(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function formatCycleDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function clampStartDay(day: number) {
  if (!Number.isInteger(day)) return DEFAULT_CYCLE_START_DAY;
  return Math.min(MAX_CYCLE_START_DAY, Math.max(MIN_CYCLE_START_DAY, day));
}

export function getFinancialCycle(inputDate: Date, startDay: number = DEFAULT_CYCLE_START_DAY): FinancialCycle {
  const cycleStartDay = clampStartDay(startDay);
  const date = atLocalNoon(inputDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  // The cycle started this month once we reach the start day, otherwise it began last month.
  const start = day >= cycleStartDay ? new Date(year, month, cycleStartDay, 12) : new Date(year, month - 1, cycleStartDay, 12);
  // The cycle ends on (startDay - 1) of the following month. Day 0 normalizes to the last day
  // of the start month, which gives a full calendar month when startDay is 1.
  const end = new Date(start.getFullYear(), start.getMonth() + 1, cycleStartDay - 1, 12);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - date.getTime()) / millisecondsPerDay) + 1);

  return {
    start,
    end,
    label: formatCycleDate(start) + " - " + formatCycleDate(end),
    daysRemaining
  };
}

export function getSalaryPaymentForCycle(cycleStart: Date) {
  const salaryDate = atLocalNoon(cycleStart);
  const day = salaryDate.getDay();

  if (day === 6) {
    return new Date(salaryDate.getFullYear(), salaryDate.getMonth(), salaryDate.getDate() - 1, 12);
  }

  if (day === 0) {
    return new Date(salaryDate.getFullYear(), salaryDate.getMonth(), salaryDate.getDate() - 2, 12);
  }

  return salaryDate;
}

export function getCycleStartForSalaryPayment(actualPaymentDate: Date, startDay: number = DEFAULT_CYCLE_START_DAY) {
  const cycleStartDay = clampStartDay(startDay);
  const paymentDate = atLocalNoon(actualPaymentDate);
  // A weekend start day is paid up to two days early, which can fall in the previous month
  // (e.g. a start day of 1 paid on the last Friday of the prior month). Check the start day in
  // both the payment month and the following month and keep the one whose salary date matches.
  const candidates = [
    new Date(paymentDate.getFullYear(), paymentDate.getMonth(), cycleStartDay, 12),
    new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, cycleStartDay, 12)
  ];

  for (const candidate of candidates) {
    if (getSalaryPaymentForCycle(candidate).toDateString() === paymentDate.toDateString()) {
      return candidate;
    }
  }

  return getFinancialCycle(paymentDate, cycleStartDay).start;
}

export async function getUserCycleStartDay(supabase: SupabaseServerClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("financial_cycle_start_day")
    .eq("user_id", userId)
    .maybeSingle();
  return clampStartDay(Number(data?.financial_cycle_start_day ?? DEFAULT_CYCLE_START_DAY));
}

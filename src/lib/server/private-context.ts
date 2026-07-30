import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getFinancialCycle } from "@/lib/finance/cycle";
import { isLocale } from "@/lib/i18n/dictionaries";

export const getPrivateContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, locale: "th" as const, startDay: 25 };
  const { data: profile } = await supabase.from("profiles").select("locale,financial_cycle_start_day").eq("user_id", user.id).maybeSingle();
  const configuredDay = Number(profile?.financial_cycle_start_day ?? 25);
  const startDay = Number.isInteger(configuredDay) ? Math.min(28, Math.max(1, configuredDay)) : 25;
  return { supabase, user, locale: isLocale(profile?.locale) ? profile.locale : "th", startDay };
});

export const getPrivateCycleContext = cache(async (asOfDate: string) => {
  const context = await getPrivateContext();
  const [year, month, day] = asOfDate.split("-").map(Number);
  const today = new Date(year, month - 1, day, 12);
  return { ...context, today, cycle: getFinancialCycle(today, context.startDay) };
});

export function todayDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

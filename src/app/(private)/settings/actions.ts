"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/lib/i18n/dictionaries";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";

/**
 * Persist the visual theme (dark default) in a cookie so SSR renders the right
 * palette with no flash. Visual-only: no DB migration, no finance data touched.
 */
export async function setTheme(formData: FormData): Promise<void> {
  const theme = resolveTheme(String(formData.get("theme") ?? ""));
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax"
  });
  revalidatePath("/", "layout");
}

export type SettingsActionState = { status: "idle" | "success" | "error"; message: string };

async function getUserContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please log in again.");
  return { supabase, userId: user.id };
}

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseLocale(value: FormDataEntryValue | null): Locale {
  return isLocale(value) ? value : "th";
}

function parseCycleStartDay(value: FormDataEntryValue | null) {
  const day = Number(value ?? 25);
  if (!Number.isInteger(day) || day < 1 || day > 28) throw new Error("Financial cycle start day must be between 1 and 28.");
  return day;
}

function parseBonusMonths(formData: FormData) {
  const months = formData
    .getAll("bonus_months")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12);
  return months.length > 0 ? [...new Set(months)].sort((a, b) => a - b) : [4, 12];
}

function revalidateSettingsViews() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function saveSettings(_previousState: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    const { supabase, userId } = await getUserContext();
    const locale = parseLocale(formData.get("locale"));
    const currency = textValue(formData, "currency") ?? "THB";
    const financialCycleStartDay = parseCycleStartDay(formData.get("financial_cycle_start_day"));
    const bonusMonths = parseBonusMonths(formData);
    const defaultAccountId = textValue(formData, "default_account_id");

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        user_id: userId,
        locale,
        currency,
        financial_cycle_start_day: financialCycleStartDay
      });
    if (profileError) throw new Error(profileError.message);

    const { error: settingsError } = await supabase
      .from("app_settings")
      .upsert({
        user_id: userId,
        bonus_months: bonusMonths,
        default_account_id: defaultAccountId
      });
    if (settingsError) throw new Error(settingsError.message);

    revalidateSettingsViews();
    return { status: "success", message: locale === "th" ? "บันทึกการตั้งค่าแล้ว" : "Settings saved." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not save settings." };
  }
}

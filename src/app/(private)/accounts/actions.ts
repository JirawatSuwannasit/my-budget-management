"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/finance/types";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";

export type AccountActionState = { status: "idle" | "success" | "error"; message: string };
type AccountMessages = Record<keyof typeof dictionaries.en.accounts.messages, string>;

const ACCOUNT_TYPES: AccountType[] = ["main_bank", "other_bank", "cash", "wallet", "savings", "investment"];

function localeFromForm(formData: FormData): Locale {
  const locale = formData.get("locale");
  return isLocale(locale) ? locale : "th";
}

function getMessages(formData: FormData): AccountMessages {
  return dictionaries[localeFromForm(formData)].accounts.messages;
}

function parseAmount(value: FormDataEntryValue | null, messages: AccountMessages) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(messages.amountNonNegative);
  return amount;
}

// Empty/missing means the low-balance alert is disabled (null), not zero.
function parseNullableAmount(value: FormDataEntryValue | null, messages: AccountMessages): number | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(messages.amountNonNegative);
  return amount;
}

function parseAccountType(value: FormDataEntryValue | null, messages: AccountMessages): AccountType {
  if (typeof value !== "string" || !ACCOUNT_TYPES.includes(value as AccountType)) throw new Error(messages.invalidType);
  return value as AccountType;
}

async function getUserId(messages: AccountMessages) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error(messages.loginAgain);
  return { supabase, userId: user.id };
}

export async function saveAccount(_previousState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserId(messages);
    const id = String(formData.get("id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const type = parseAccountType(formData.get("type"), messages);
    const balance = parseAmount(formData.get("balance"), messages);
    const lowBalanceThreshold = parseNullableAmount(formData.get("low_balance_threshold"), messages);
    const active = formData.get("active") === "on";
    if (!name) throw new Error(messages.nameRequired);

    const payload = { user_id: userId, name, type, balance, low_balance_threshold: lowBalanceThreshold, active };
    if (id) {
      const { error } = await supabase.from("accounts").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidatePath("/accounts");
      revalidatePath("/dashboard");
      return { status: "success", message: messages.updated };
    }

    const { error } = await supabase.from("accounts").insert(payload);
    if (error) throw new Error(error.message);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { status: "success", message: messages.added };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : messages.saveFailed };
  }
}

export async function setAccountActive(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserId(messages);
  const id = String(formData.get("id") ?? "").trim();
  const active = formData.get("active") === "true";
  if (!id) throw new Error(messages.idRequired);
  const { error } = await supabase.from("accounts").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";
import { isQuickTransactionType } from "@/lib/finance/quick-templates";

export type QuickTemplateActionState = { status: "idle" | "success" | "error"; message: string };

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function localeFrom(formData: FormData): Locale {
  const locale = formData.get("locale");
  return isLocale(locale) ? locale : "th";
}

async function getUserContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please log in again.");
  return { supabase, userId: user.id };
}

export async function saveQuickTemplate(_previousState: QuickTemplateActionState, formData: FormData): Promise<QuickTemplateActionState> {
  const locale = localeFrom(formData);
  const t = dictionaries[locale].transactions.quickAdd;
  try {
    const { supabase, userId } = await getUserContext();
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const type = String(formData.get("type") ?? "");
    const amountText = String(formData.get("amount") ?? "").trim();
    const amount = amountText ? Number(amountText) : null;
    if (!name) throw new Error(t.name);
    if (!isQuickTransactionType(type)) throw new Error(t.unsupported);
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) throw new Error(dictionaries[locale].transactions.messages.amountPositive);

    const accountId = textValue(formData, "account_id");
    const categoryId = textValue(formData, "category_id");
    if (accountId) {
      const { data } = await supabase.from("accounts").select("id").eq("id", accountId).eq("user_id", userId).eq("active", true).maybeSingle();
      if (!data) throw new Error(t.invalidReference);
    }
    if (categoryId) {
      const { data } = await supabase.from("categories").select("id").eq("id", categoryId).eq("user_id", userId).eq("active", true).maybeSingle();
      if (!data) throw new Error(t.invalidReference);
    }

    // Intentionally leave legacy notes/sort_order untouched on edits. New
    // templates use their database defaults; neither field is part of the UI.
    const values = { user_id: userId, name, type, amount, account_id: accountId, category_id: categoryId, related_entity_id: null, icon_key: textValue(formData, "icon_key"), active: formData.get("active") === "on" };
    const query = id
      ? supabase.from("quick_transaction_templates").update(values).eq("id", id).eq("user_id", userId)
      : supabase.from("quick_transaction_templates").insert(values);
    const { error } = await query;
    if (error) throw new Error(error.message);
    revalidatePath("/transactions");
    return { status: "success", message: t.saved };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : t.invalidReference };
  }
}

export async function deleteQuickTemplate(formData: FormData) {
  const { supabase, userId } = await getUserContext();
  const id = textValue(formData, "id");
  if (!id) return;
  const { error } = await supabase.from("quick_transaction_templates").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}

export async function toggleQuickTemplate(formData: FormData) {
  const { supabase, userId } = await getUserContext();
  const id = textValue(formData, "id");
  if (!id) return;
  const active = String(formData.get("active")) === "true";
  const { error } = await supabase.from("quick_transaction_templates").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}

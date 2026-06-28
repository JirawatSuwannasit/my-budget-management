"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CategoryKind } from "@/lib/finance/types";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";

export type CategoryActionState = { status: "idle" | "success" | "error"; message: string };
type CategoryMessages = Record<keyof typeof dictionaries.en.categories.messages, string>;

const categoryKinds: CategoryKind[] = ["income", "expense", "transfer", "debt", "subscription", "sinking_fund", "investment", "other"];

function localeFromForm(formData: FormData): Locale {
  const locale = formData.get("locale");
  return isLocale(locale) ? locale : "th";
}

function getMessages(formData: FormData): CategoryMessages {
  return dictionaries[localeFromForm(formData)].categories.messages;
}

async function getUserContext(messages: CategoryMessages = dictionaries.th.categories.messages) {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error(messages.loginAgain);
  return { supabase, userId: user.id };
}

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseKind(value: FormDataEntryValue | null, messages: CategoryMessages): CategoryKind {
  if (typeof value !== "string" || !categoryKinds.includes(value as CategoryKind)) {
    throw new Error(messages.invalidType);
  }
  return value as CategoryKind;
}

function revalidateCategoryViews() {
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function saveCategory(_previousState: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const messages = getMessages(formData);
  try {
    const { supabase, userId } = await getUserContext(messages);
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const kind = parseKind(formData.get("kind"), messages);
    const color = textValue(formData, "color") ?? "#0f766e";
    const iconKey = textValue(formData, "icon_key") ?? "tag";
    const active = formData.get("active") === "on";

    if (!name) throw new Error(messages.nameRequired);

    const payload = { user_id: userId, name, kind, color, icon_key: iconKey, active };
    if (id) {
      const { error } = await supabase.from("categories").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidateCategoryViews();
      return { status: "success", message: messages.updated };
    }

    const { error } = await supabase.from("categories").insert(payload);
    if (error) throw new Error(error.message);
    revalidateCategoryViews();
    return { status: "success", message: messages.added };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : messages.saveFailed };
  }
}

export async function setCategoryActive(formData: FormData) {
  const messages = getMessages(formData);
  const { supabase, userId } = await getUserContext(messages);
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error(messages.idRequired);
  const { error } = await supabase.from("categories").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateCategoryViews();
}

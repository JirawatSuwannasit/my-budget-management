"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CategoryKind } from "@/lib/finance/types";

export type CategoryActionState = { status: "idle" | "success" | "error"; message: string };

const categoryKinds: CategoryKind[] = ["income", "expense", "transfer", "debt", "subscription", "sinking_fund", "investment", "other"];

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

function parseKind(value: FormDataEntryValue | null): CategoryKind {
  if (typeof value !== "string" || !categoryKinds.includes(value as CategoryKind)) {
    throw new Error("Choose a valid category type.");
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
  try {
    const { supabase, userId } = await getUserContext();
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const kind = parseKind(formData.get("kind"));
    const color = textValue(formData, "color") ?? "#0f766e";
    const iconKey = textValue(formData, "icon_key") ?? "tag";
    const active = formData.get("active") === "on";

    if (!name) throw new Error("Category name is required.");

    const payload = { user_id: userId, name, kind, color, icon_key: iconKey, active };
    if (id) {
      const { error } = await supabase.from("categories").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidateCategoryViews();
      return { status: "success", message: "Category updated." };
    }

    const { error } = await supabase.from("categories").insert(payload);
    if (error) throw new Error(error.message);
    revalidateCategoryViews();
    return { status: "success", message: "Category added." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not save category." };
  }
}

export async function setCategoryActive(formData: FormData) {
  const { supabase, userId } = await getUserContext();
  const id = textValue(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Category id is required.");
  const { error } = await supabase.from("categories").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateCategoryViews();
}

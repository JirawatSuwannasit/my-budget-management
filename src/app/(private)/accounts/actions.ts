"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/finance/types";

export type AccountActionState = { status: "idle" | "success" | "error"; message: string };

const ACCOUNT_TYPES: AccountType[] = ["main_bank", "other_bank", "cash", "wallet", "investment"];

function parseAmount(value: FormDataEntryValue | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Amount must be zero or more.");
  return amount;
}

function parseAccountType(value: FormDataEntryValue | null): AccountType {
  if (typeof value !== "string" || !ACCOUNT_TYPES.includes(value as AccountType)) throw new Error("Choose a valid account type.");
  return value as AccountType;
}

async function getUserId() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please log in again.");
  return { supabase, userId: user.id };
}

export async function saveAccount(_previousState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  try {
    const { supabase, userId } = await getUserId();
    const id = String(formData.get("id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const type = parseAccountType(formData.get("type"));
    const balance = parseAmount(formData.get("balance"));
    const active = formData.get("active") === "on";
    if (!name) throw new Error("Account name is required.");

    const payload = { user_id: userId, name, type, balance, active };
    if (id) {
      const { error } = await supabase.from("accounts").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      revalidatePath("/accounts");
      revalidatePath("/dashboard");
      return { status: "success", message: "Account updated." };
    }

    const { error } = await supabase.from("accounts").insert(payload);
    if (error) throw new Error(error.message);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { status: "success", message: "Account added." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not save account." };
  }
}

export async function setAccountActive(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const id = String(formData.get("id") ?? "").trim();
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Account id is required.");
  const { error } = await supabase.from("accounts").update({ active }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

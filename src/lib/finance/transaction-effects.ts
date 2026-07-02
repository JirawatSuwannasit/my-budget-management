import type { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "./types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type BalanceEffectInput = {
  type: TransactionType;
  amount: number;
  accountId?: string | null;
  destinationAccountId?: string | null;
};

export type AccountBalanceDelta = {
  accountId: string;
  delta: number;
};

export function addDelta(deltas: AccountBalanceDelta[], accountId: string | null | undefined, delta: number) {
  if (!accountId || delta === 0) return;
  const existing = deltas.find((item) => item.accountId === accountId);
  if (existing) {
    existing.delta += delta;
    return;
  }
  deltas.push({ accountId, delta });
}

export function getAccountBalanceDeltas(input: BalanceEffectInput): AccountBalanceDelta[] {
  const deltas: AccountBalanceDelta[] = [];

  switch (input.type) {
    case "income":
      addDelta(deltas, input.accountId, input.amount);
      break;
    case "expense":
    case "credit_card_payment":
    case "debt_payment":
      addDelta(deltas, input.accountId, -input.amount);
      break;
    case "transfer":
    case "investment_transfer":
    case "sinking_fund_reserve":
      // A sinking fund reserve is a real transfer from the source (cash-like)
      // account into the bound reserve account. Both are cash-like, so total
      // safe-to-spend is unchanged; the generic revert path reverses it.
      addDelta(deltas, input.accountId, -input.amount);
      addDelta(deltas, input.destinationAccountId, input.amount);
      break;
    case "credit_card_expense":
      break;
  }

  return deltas.filter((delta) => delta.delta !== 0);
}

export function getReverseAccountBalanceDeltas(input: BalanceEffectInput): AccountBalanceDelta[] {
  return getAccountBalanceDeltas(input).map((delta) => ({ accountId: delta.accountId, delta: -delta.delta }));
}

/**
 * Applies a set of account balance deltas with one batched read, an in-memory
 * below-zero validation pass over every affected account, and parallel
 * per-account writes — replacing a SELECT+UPDATE round trip per account.
 * Every account is validated before any write is issued, so a rejected save
 * never partially applies a balance change.
 */
export async function applyAccountBalanceDeltas(supabase: SupabaseServer, userId: string, deltas: AccountBalanceDelta[], belowZeroMessage: string): Promise<void> {
  if (deltas.length === 0) return;

  const ids = deltas.map((delta) => delta.accountId);
  const { data, error } = await supabase.from("accounts").select("id,balance").eq("user_id", userId).in("id", ids);
  if (error) throw new Error(error.message);

  const balanceById = new Map((data ?? []).map((row) => [row.id, row.balance]));

  const writes: Array<{ accountId: string; nextBalance: number }> = [];
  for (const delta of deltas) {
    let currentBalance = balanceById.get(delta.accountId);
    if (currentBalance === undefined) {
      // Preserve the exact error the previous per-account `.single()` read
      // produced when an account id could not be resolved for this user.
      const { data: fallback, error: missingError } = await supabase.from("accounts").select("balance").eq("id", delta.accountId).eq("user_id", userId).single();
      if (missingError) throw new Error(missingError.message);
      currentBalance = fallback.balance;
    }
    const nextBalance = Number(currentBalance ?? 0) + delta.delta;
    if (nextBalance < 0) throw new Error(belowZeroMessage);
    writes.push({ accountId: delta.accountId, nextBalance });
  }

  await Promise.all(
    writes.map(async ({ accountId, nextBalance }) => {
      const { error: updateError } = await supabase.from("accounts").update({ balance: nextBalance }).eq("id", accountId).eq("user_id", userId);
      if (updateError) throw new Error(updateError.message);
    })
  );
}

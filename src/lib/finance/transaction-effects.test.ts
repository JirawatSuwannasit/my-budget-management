import { describe, expect, it } from "vitest";
import { createSupabaseMock, asSupabaseClient } from "./__tests__/supabase-mock";
import { applyAccountBalanceDeltas, reverseLinkedDebtPayments, type AccountBalanceDelta } from "./transaction-effects";

const BELOW_ZERO_MESSAGE = "balance would go below zero";
const MISSING_ACCOUNT_ERROR = "no rows found in accounts";

type SupabaseArg = Parameters<typeof applyAccountBalanceDeltas>[0];

/** Balance writes recorded by the shared mock, in call order. */
function balanceWrites(calls: ReturnType<typeof createSupabaseMock>["calls"]) {
  return calls.filter((call) => call.op === "update" && call.table === "accounts").map((call) => ({ id: call.filters.id as string, balance: (call.payload as { balance: number }).balance }));
}

describe("applyAccountBalanceDeltas", () => {
  it("debits the source account for a single expense", async () => {
    const { supabase, calls } = createSupabaseMock({ accounts: [{ id: "cash", user_id: "user-1", balance: 500 }] });
    const deltas: AccountBalanceDelta[] = [{ accountId: "cash", delta: -150 }];

    await applyAccountBalanceDeltas(asSupabaseClient<SupabaseArg>(supabase), "user-1", deltas, BELOW_ZERO_MESSAGE);

    expect(balanceWrites(calls)).toEqual([{ id: "cash", balance: 350 }]);
  });

  it("debits the source and credits the destination for a transfer, matching the old per-account result", async () => {
    const { supabase, calls } = createSupabaseMock({ accounts: [{ id: "main", user_id: "user-1", balance: 1000 }, { id: "wallet", user_id: "user-1", balance: 200 }] });
    const deltas: AccountBalanceDelta[] = [
      { accountId: "main", delta: -500 },
      { accountId: "wallet", delta: 500 }
    ];

    await applyAccountBalanceDeltas(asSupabaseClient<SupabaseArg>(supabase), "user-1", deltas, BELOW_ZERO_MESSAGE);

    const byId = new Map(balanceWrites(calls).map((call) => [call.id, call.balance]));
    expect(byId.get("main")).toBe(500);
    expect(byId.get("wallet")).toBe(700);
    expect(balanceWrites(calls)).toHaveLength(2);
  });

  it("throws the below-zero message and performs no balance update when any affected account would go negative", async () => {
    const { supabase, calls } = createSupabaseMock({ accounts: [{ id: "cash", user_id: "user-1", balance: 100 }] });
    const deltas: AccountBalanceDelta[] = [{ accountId: "cash", delta: -150 }];

    await expect(applyAccountBalanceDeltas(asSupabaseClient<SupabaseArg>(supabase), "user-1", deltas, BELOW_ZERO_MESSAGE)).rejects.toThrow(BELOW_ZERO_MESSAGE);
    expect(balanceWrites(calls)).toEqual([]);
  });

  it("throws the below-zero message for a transfer that would drain the source, writing no balances at all", async () => {
    const { supabase, calls } = createSupabaseMock({ accounts: [{ id: "main", user_id: "user-1", balance: 100 }, { id: "wallet", user_id: "user-1", balance: 0 }] });
    const deltas: AccountBalanceDelta[] = [
      { accountId: "main", delta: -500 },
      { accountId: "wallet", delta: 500 }
    ];

    await expect(applyAccountBalanceDeltas(asSupabaseClient<SupabaseArg>(supabase), "user-1", deltas, BELOW_ZERO_MESSAGE)).rejects.toThrow(BELOW_ZERO_MESSAGE);
    expect(balanceWrites(calls)).toEqual([]);
  });

  it("throws the same error a missing account's .single() read would have produced, and writes nothing", async () => {
    const { supabase, calls } = createSupabaseMock({ accounts: [] });
    const deltas: AccountBalanceDelta[] = [{ accountId: "ghost", delta: -10 }];

    await expect(applyAccountBalanceDeltas(asSupabaseClient<SupabaseArg>(supabase), "user-1", deltas, BELOW_ZERO_MESSAGE)).rejects.toThrow(MISSING_ACCOUNT_ERROR);
    expect(balanceWrites(calls)).toEqual([]);
  });

  it("is a no-op for an empty delta list", async () => {
    const { supabase, calls } = createSupabaseMock({ accounts: [] });

    await applyAccountBalanceDeltas(asSupabaseClient<SupabaseArg>(supabase), "user-1", [], BELOW_ZERO_MESSAGE);

    expect(balanceWrites(calls)).toEqual([]);
  });
});

describe("reverseLinkedDebtPayments", () => {
  type ReverseSupabaseArg = Parameters<typeof reverseLinkedDebtPayments>[0];

  it("restores remaining_balance and deletes the linked debt_payments row for a reversed card-linked installment charge", async () => {
    const { supabase, tables, calls } = createSupabaseMock({
      debt_payments: [{ id: "dp-1", user_id: "user-1", transaction_id: "txn-1", debt_id: "debt-1", amount: 396 }],
      // remaining_balance as it stands after the charge being reversed
      debts: [{ id: "debt-1", user_id: "user-1", remaining_balance: 396 }]
    });

    await reverseLinkedDebtPayments(asSupabaseClient<ReverseSupabaseArg>(supabase), "user-1", "txn-1");

    expect(tables.debts[0].remaining_balance).toBe(792);
    expect(tables.debt_payments).toEqual([]);
    expect(calls.some((call) => call.op === "delete" && call.table === "debt_payments" && call.filters.transaction_id === "txn-1")).toBe(true);
  });

  it("is a no-op when no debt_payments row is linked to the transaction (a plain, non-installment card expense)", async () => {
    const { supabase, calls } = createSupabaseMock({ debt_payments: [], debts: [] });

    await reverseLinkedDebtPayments(asSupabaseClient<ReverseSupabaseArg>(supabase), "user-1", "txn-2");

    expect(calls.filter((call) => call.op === "update" || call.op === "delete")).toEqual([]);
  });
});

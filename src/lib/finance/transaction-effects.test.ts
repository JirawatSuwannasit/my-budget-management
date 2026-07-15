import { describe, expect, it } from "vitest";
import { applyAccountBalanceDeltas, reverseLinkedDebtPayments, type AccountBalanceDelta } from "./transaction-effects";

type AccountRow = { id: string; balance: number };

const BELOW_ZERO_MESSAGE = "balance would go below zero";
const MISSING_ACCOUNT_ERROR = "missing account for this user";

/**
 * Minimal fluent mock of the Supabase query builder shape used by
 * applyAccountBalanceDeltas: a batched `.select().eq().in()` read, a
 * per-account `.select().eq().eq().single()` fallback read, and a
 * `.update().eq().eq()` write. No real network is involved.
 */
function createSupabaseMock(rows: AccountRow[]) {
  const updateCalls: Array<{ id: string; balance: number }> = [];

  function selectBuilder() {
    let single = false;
    let idFilter: string | undefined;
    const builder = {
      eq(column: string, value: string) {
        if (column === "id") idFilter = value;
        return builder;
      },
      in() {
        return builder;
      },
      single() {
        single = true;
        return builder;
      },
      then(resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
        const result = single
          ? (() => {
              const row = rows.find((item) => item.id === idFilter);
              return row ? { data: { balance: row.balance }, error: null } : { data: null, error: { message: MISSING_ACCOUNT_ERROR } };
            })()
          : { data: rows, error: null };
        return Promise.resolve(result).then(resolve, reject);
      }
    };
    return builder;
  }

  function updateBuilder(payload: { balance: number }) {
    let idFilter = "";
    const builder = {
      eq(column: string, value: string) {
        if (column === "id") idFilter = value;
        return builder;
      },
      then(resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
        updateCalls.push({ id: idFilter, balance: payload.balance });
        return Promise.resolve({ error: null }).then(resolve, reject);
      }
    };
    return builder;
  }

  const supabase = {
    from(table: string) {
      if (table !== "accounts") throw new Error("unexpected table: " + table);
      return {
        select: () => selectBuilder(),
        update: (payload: { balance: number }) => updateBuilder(payload)
      };
    }
  };

  return { supabase, updateCalls };
}

function asSupabase(supabase: unknown) {
  return supabase as Parameters<typeof applyAccountBalanceDeltas>[0];
}

describe("applyAccountBalanceDeltas", () => {
  it("debits the source account for a single expense", async () => {
    const { supabase, updateCalls } = createSupabaseMock([{ id: "cash", balance: 500 }]);
    const deltas: AccountBalanceDelta[] = [{ accountId: "cash", delta: -150 }];

    await applyAccountBalanceDeltas(asSupabase(supabase), "user-1", deltas, BELOW_ZERO_MESSAGE);

    expect(updateCalls).toEqual([{ id: "cash", balance: 350 }]);
  });

  it("debits the source and credits the destination for a transfer, matching the old per-account result", async () => {
    const { supabase, updateCalls } = createSupabaseMock([
      { id: "main", balance: 1000 },
      { id: "wallet", balance: 200 }
    ]);
    const deltas: AccountBalanceDelta[] = [
      { accountId: "main", delta: -500 },
      { accountId: "wallet", delta: 500 }
    ];

    await applyAccountBalanceDeltas(asSupabase(supabase), "user-1", deltas, BELOW_ZERO_MESSAGE);

    const byId = new Map(updateCalls.map((call) => [call.id, call.balance]));
    expect(byId.get("main")).toBe(500);
    expect(byId.get("wallet")).toBe(700);
    expect(updateCalls).toHaveLength(2);
  });

  it("throws the below-zero message and performs no balance update when any affected account would go negative", async () => {
    const { supabase, updateCalls } = createSupabaseMock([{ id: "cash", balance: 100 }]);
    const deltas: AccountBalanceDelta[] = [{ accountId: "cash", delta: -150 }];

    await expect(applyAccountBalanceDeltas(asSupabase(supabase), "user-1", deltas, BELOW_ZERO_MESSAGE)).rejects.toThrow(BELOW_ZERO_MESSAGE);
    expect(updateCalls).toEqual([]);
  });

  it("throws the below-zero message for a transfer that would drain the source, writing no balances at all", async () => {
    const { supabase, updateCalls } = createSupabaseMock([
      { id: "main", balance: 100 },
      { id: "wallet", balance: 0 }
    ]);
    const deltas: AccountBalanceDelta[] = [
      { accountId: "main", delta: -500 },
      { accountId: "wallet", delta: 500 }
    ];

    await expect(applyAccountBalanceDeltas(asSupabase(supabase), "user-1", deltas, BELOW_ZERO_MESSAGE)).rejects.toThrow(BELOW_ZERO_MESSAGE);
    expect(updateCalls).toEqual([]);
  });

  it("throws the same error a missing account's .single() read would have produced, and writes nothing", async () => {
    const { supabase, updateCalls } = createSupabaseMock([]);
    const deltas: AccountBalanceDelta[] = [{ accountId: "ghost", delta: -10 }];

    await expect(applyAccountBalanceDeltas(asSupabase(supabase), "user-1", deltas, BELOW_ZERO_MESSAGE)).rejects.toThrow(MISSING_ACCOUNT_ERROR);
    expect(updateCalls).toEqual([]);
  });

  it("is a no-op for an empty delta list", async () => {
    const { supabase, updateCalls } = createSupabaseMock([]);

    await applyAccountBalanceDeltas(asSupabase(supabase), "user-1", [], BELOW_ZERO_MESSAGE);

    expect(updateCalls).toEqual([]);
  });
});

describe("reverseLinkedDebtPayments", () => {
  /**
   * Minimal fluent mock covering the three operations reverseLinkedDebtPayments
   * exercises: a select on debt_payments, a select+update on debts (via
   * updateDebtRemaining), and a delete on debt_payments keyed by transaction_id.
   */
  function createDebtPaymentsMock({ debtPayments, debts }: { debtPayments: Array<{ id: string; debt_id: string; amount: number }>; debts: Record<string, number> }) {
    const debtUpdates: Array<{ id: string; balance: number }> = [];
    const deletedTransactionIds: string[] = [];

    function selectBuilder(table: string) {
      const filters: Record<string, string> = {};
      let single = false;
      const builder = {
        eq(column: string, value: string) {
          filters[column] = value;
          return builder;
        },
        single() {
          single = true;
          return builder;
        },
        then(resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
          let result: { data: unknown; error: unknown };
          if (table === "debt_payments") {
            result = { data: debtPayments, error: null };
          } else if (table === "debts" && single) {
            const balance = debts[filters.id];
            result = balance !== undefined ? { data: { remaining_balance: balance }, error: null } : { data: null, error: { message: "missing debt" } };
          } else {
            result = { data: null, error: { message: "unexpected read on " + table } };
          }
          return Promise.resolve(result).then(resolve, reject);
        }
      };
      return builder;
    }

    function updateBuilder(table: string, payload: { remaining_balance: number }) {
      const filters: Record<string, string> = {};
      const builder = {
        eq(column: string, value: string) {
          filters[column] = value;
          return builder;
        },
        then(resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
          if (table === "debts") debtUpdates.push({ id: filters.id, balance: payload.remaining_balance });
          return Promise.resolve({ error: null }).then(resolve, reject);
        }
      };
      return builder;
    }

    function deleteBuilder(table: string) {
      const filters: Record<string, string> = {};
      const builder = {
        eq(column: string, value: string) {
          filters[column] = value;
          return builder;
        },
        then(resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
          if (table === "debt_payments") deletedTransactionIds.push(filters.transaction_id);
          return Promise.resolve({ error: null }).then(resolve, reject);
        }
      };
      return builder;
    }

    const supabase = {
      from(table: string) {
        return {
          select: () => selectBuilder(table),
          update: (payload: { remaining_balance: number }) => updateBuilder(table, payload),
          delete: () => deleteBuilder(table)
        };
      }
    };

    return { supabase, debtUpdates, deletedTransactionIds };
  }

  function asDebtPaymentsSupabase(supabase: unknown) {
    return supabase as Parameters<typeof reverseLinkedDebtPayments>[0];
  }

  it("restores remaining_balance and deletes the linked debt_payments row for a reversed card-linked installment charge", async () => {
    const { supabase, debtUpdates, deletedTransactionIds } = createDebtPaymentsMock({
      debtPayments: [{ id: "dp-1", debt_id: "debt-1", amount: 396 }],
      debts: { "debt-1": 396 } // remaining_balance after the charge being reversed
    });

    await reverseLinkedDebtPayments(asDebtPaymentsSupabase(supabase), "user-1", "txn-1");

    expect(debtUpdates).toEqual([{ id: "debt-1", balance: 792 }]);
    expect(deletedTransactionIds).toEqual(["txn-1"]);
  });

  it("is a no-op when no debt_payments row is linked to the transaction (a plain, non-installment card expense)", async () => {
    const { supabase, debtUpdates, deletedTransactionIds } = createDebtPaymentsMock({ debtPayments: [], debts: {} });

    await reverseLinkedDebtPayments(asDebtPaymentsSupabase(supabase), "user-1", "txn-2");

    expect(debtUpdates).toEqual([]);
    expect(deletedTransactionIds).toEqual([]);
  });
});

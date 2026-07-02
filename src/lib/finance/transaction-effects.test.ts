import { describe, expect, it } from "vitest";
import { applyAccountBalanceDeltas, type AccountBalanceDelta } from "./transaction-effects";

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

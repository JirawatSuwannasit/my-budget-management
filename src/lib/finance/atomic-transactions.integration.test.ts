import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anonKey && serviceKey);

describe.skipIf(!enabled)("atomic finance RPCs (local Supabase)", () => {
  const admin = createClient(url ?? "http://127.0.0.1:54321", serviceKey ?? "integration-tests-disabled", { auth: { persistSession: false } });
  const client = createClient(url ?? "http://127.0.0.1:54321", anonKey ?? "integration-tests-disabled", { auth: { persistSession: false } });
  const email = `atomic-${Date.now()}@example.test`;
  const password = "local-integration-test-password";
  let userId = "";
  let sourceId = "";
  let destinationId = "";

  beforeAll(async () => {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error("User creation failed");
    userId = created.data.user.id;
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    const accounts = await admin.from("accounts").insert([
      { user_id: userId, name: "Source", type: "main_bank", balance: 1000 },
      { user_id: userId, name: "Destination", type: "cash", balance: 0 }
    ]).select("id,name");
    if (accounts.error) throw accounts.error;
    sourceId = accounts.data.find((row) => row.name === "Source")!.id;
    destinationId = accounts.data.find((row) => row.name === "Destination")!.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  const base = () => ({
    p_amount: 100,
    p_account_id: sourceId,
    p_transaction_date: "2026-07-29",
    p_cycle_start_date: "2026-07-25"
  });

  it("serializes two concurrent expenses without losing either debit", async () => {
    const [first, second] = await Promise.all([
      client.rpc("create_finance_transaction", { p_type: "expense", ...base() }),
      client.rpc("create_finance_transaction", { p_type: "expense", ...base() })
    ]);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    const balance = await admin.from("accounts").select("balance").eq("id", sourceId).single();
    expect(Number(balance.data!.balance)).toBe(800);
  });

  it("serializes transfers and rolls an overdrawn transfer back without destination credit", async () => {
    await admin.from("accounts").update({ balance: 150 }).eq("id", sourceId);
    await admin.from("accounts").update({ balance: 0 }).eq("id", destinationId);
    const args = { p_type: "transfer", p_destination_account_id: destinationId, ...base() };
    const results = await Promise.all([client.rpc("create_finance_transaction", args), client.rpc("create_finance_transaction", args)]);
    expect(results.filter((result) => result.error === null)).toHaveLength(1);
    expect(results.filter((result) => result.error?.message.includes("FINANCE_INSUFFICIENT_BALANCE"))).toHaveLength(1);
    const accounts = await admin.from("accounts").select("id,balance").in("id", [sourceId, destinationId]);
    const balances = new Map(accounts.data!.map((row) => [row.id, Number(row.balance)]));
    expect(balances.get(sourceId)).toBe(50);
    expect(balances.get(destinationId)).toBe(100);
  });

  it("rolls back the transaction and cash debit when a child reference is invalid", async () => {
    await admin.from("accounts").update({ balance: 500 }).eq("id", sourceId);
    const before = await admin.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId);
    const result = await client.rpc("create_finance_transaction", {
      p_type: "credit_card_payment",
      p_credit_card_id: "00000000-0000-0000-0000-000000000001",
      ...base()
    });
    expect(result.error?.message).toContain("FINANCE_INVALID_REFERENCE");
    const [account, after] = await Promise.all([
      admin.from("accounts").select("balance").eq("id", sourceId).single(),
      admin.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId)
    ]);
    expect(Number(account.data!.balance)).toBe(500);
    expect(after.count).toBe(before.count);
  });
});

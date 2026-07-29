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

  it("serializes concurrent debt payments without losing either debt reduction", async () => {
    await admin.from("accounts").update({ balance: 1000 }).eq("id", sourceId);
    const debt = await admin.from("debts").insert({
      user_id: userId, name: "Concurrent debt", type: "other",
      original_amount: 500, remaining_balance: 500, monthly_payment: 100
    }).select("id").single();
    if (debt.error) throw debt.error;
    const args = {
      p_type: "debt_payment", p_amount: 100, p_account_id: sourceId,
      p_debt_id: debt.data.id, p_transaction_date: "2026-07-29",
      p_cycle_start_date: "2026-07-25"
    };
    const results = await Promise.all([
      client.rpc("create_finance_transaction", args),
      client.rpc("create_finance_transaction", args)
    ]);
    expect(results.every((result) => result.error === null)).toBe(true);
    const remaining = await admin.from("debts").select("remaining_balance").eq("id", debt.data.id).single();
    expect(Number(remaining.data!.remaining_balance)).toBe(300);
  });

  it("materializes an account subscription once per cycle under concurrent retries", async () => {
    await admin.from("accounts").update({ balance: 1000 }).eq("id", sourceId);
    const subscription = await admin.from("subscriptions").insert({
      user_id: userId, name: "Concurrent subscription", frequency: "monthly",
      price: 125, billing_day: 1, source_account_id: sourceId, active: true
    }).select("id").single();
    if (subscription.error) throw subscription.error;
    const call = (cycle: string) => client.rpc("materialize_due_subscription_charge", {
      p_subscription_id: subscription.data.id,
      p_cycle_start_date: cycle,
      p_transaction_date: cycle
    });
    const concurrent = await Promise.all([call("2026-07-25"), call("2026-07-25")]);
    expect(concurrent.map((result) => result.data?.status).sort()).toEqual(["already_processed", "created"]);
    const retry = await call("2026-07-25");
    expect(retry.data?.status).toBe("already_processed");
    const [transactions, balance] = await Promise.all([
      admin.from("transactions").select("id", { count: "exact", head: true }).eq("related_entity_id", subscription.data.id).eq("cycle_start_date", "2026-07-25"),
      admin.from("accounts").select("balance").eq("id", sourceId).single()
    ]);
    expect(transactions.count).toBe(1);
    expect(Number(balance.data!.balance)).toBe(875);
    const nextCycle = await call("2026-08-25");
    expect(nextCycle.data?.status).toBe("created");
  });

  it("materializes a card subscription without reducing cash", async () => {
    const card = await admin.from("credit_cards").insert({
      user_id: userId, name: "Subscription card", billing_cut_day: 15, payment_due_day: 25
    }).select("id").single();
    if (card.error) throw card.error;
    const subscription = await admin.from("subscriptions").insert({
      user_id: userId, name: "Card subscription", frequency: "monthly", price: 80,
      billing_day: 1, source_card_id: card.data.id, active: true
    }).select("id").single();
    if (subscription.error) throw subscription.error;
    const before = await admin.from("accounts").select("balance").eq("id", sourceId).single();
    const result = await client.rpc("materialize_due_subscription_charge", {
      p_subscription_id: subscription.data.id,
      p_cycle_start_date: "2026-07-25", p_transaction_date: "2026-07-25"
    });
    expect(result.data?.status).toBe("created");
    const [after, cardRows] = await Promise.all([
      admin.from("accounts").select("balance").eq("id", sourceId).single(),
      admin.from("card_transactions").select("id", { count: "exact", head: true }).eq("transaction_id", result.data.transaction_id)
    ]);
    expect(after.data!.balance).toBe(before.data!.balance);
    expect(cardRows.count).toBe(1);
  });

  it("materializes an installment and final remainder exactly once per cycle", async () => {
    const card = await admin.from("credit_cards").insert({
      user_id: userId, name: "Installment card", billing_cut_day: 15, payment_due_day: 25
    }).select("id").single();
    if (card.error) throw card.error;
    const debt = await admin.from("debts").insert({
      user_id: userId, name: "Remainder installment", type: "installment",
      original_amount: 150, remaining_balance: 150, monthly_payment: 100,
      card_id: card.data.id, active: true
    }).select("id").single();
    if (debt.error) throw debt.error;
    const call = (cycle: string) => client.rpc("materialize_due_installment_charge", {
      p_debt_id: debt.data.id, p_cycle_start_date: cycle, p_transaction_date: cycle
    });
    const concurrent = await Promise.all([call("2026-07-25"), call("2026-07-25")]);
    expect(concurrent.map((result) => result.data?.status).sort()).toEqual(["already_processed", "created"]);
    const retry = await call("2026-07-25");
    expect(retry.data?.status).toBe("already_processed");
    const next = await call("2026-08-25");
    expect(next.data?.status).toBe("created");
    const [remaining, transactions, cardRows, payments] = await Promise.all([
      admin.from("debts").select("remaining_balance").eq("id", debt.data.id).single(),
      admin.from("transactions").select("amount").eq("related_entity_id", debt.data.id).order("cycle_start_date"),
      admin.from("card_transactions").select("id", { count: "exact", head: true }).eq("card_id", card.data.id),
      admin.from("debt_payments").select("id", { count: "exact", head: true }).eq("debt_id", debt.data.id)
    ]);
    expect(Number(remaining.data!.remaining_balance)).toBe(0);
    expect(transactions.data!.map((row) => Number(row.amount))).toEqual([100, 50]);
    expect(cardRows.count).toBe(2);
    expect(payments.count).toBe(2);
  });
});

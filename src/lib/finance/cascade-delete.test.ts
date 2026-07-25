import { describe, expect, it } from "vitest";
import { asSupabaseClient, createSupabaseMock } from "./__tests__/supabase-mock";
import { cascadeDeleteCreditCard, findTransactionsForCard, revertAndDeleteTransactions, type CardDeleteMessages, type ReversalMessages, type TransactionRow } from "./cascade-delete";
import { findTransactionsForRelatedEntity } from "./cascade-delete";

type SupabaseArg = Parameters<typeof revertAndDeleteTransactions>[0];

const USER = "user-1";
const OTHER_USER = "user-2";

const messages: CardDeleteMessages = {
  balanceBelowZero: "balance below zero",
  unsafeCardExpense: "unsafe card expense",
  unsafeCardPayment: "unsafe card payment",
  unsafeDebtPayment: "unsafe debt payment",
  cardHasLinkedDebts: "card has linked installments",
  cardHasLinkedSubscriptions: "card has linked subscriptions"
};

function transaction(overrides: Partial<TransactionRow> & { id: string }): TransactionRow {
  return {
    account_id: null,
    destination_account_id: null,
    type: "expense",
    amount: 0,
    transaction_date: "2026-07-10",
    cycle_start_date: "2026-07-01",
    related_entity_id: null,
    notes: null,
    ...overrides
  };
}

function client(supabase: unknown) {
  return asSupabaseClient<SupabaseArg>(supabase);
}

describe("findTransactionsForRelatedEntity", () => {
  it("matches only on related_entity_id scoped by user_id, never on notes, category, or amount", async () => {
    const { supabase } = createSupabaseMock({
      transactions: [
        { id: "t-mine", user_id: USER, related_entity_id: "sub-1", type: "expense", amount: 100, notes: "Auto-charged subscription" },
        { id: "t-other-user", user_id: OTHER_USER, related_entity_id: "sub-1", type: "expense", amount: 100, notes: "Auto-charged subscription" },
        { id: "t-same-notes", user_id: USER, related_entity_id: "sub-2", type: "expense", amount: 100, notes: "Auto-charged subscription" },
        { id: "t-unlinked", user_id: USER, related_entity_id: null, type: "expense", amount: 100, notes: "Auto-charged subscription" }
      ]
    });

    const found = await findTransactionsForRelatedEntity(client(supabase), USER, "sub-1");

    expect(found.map((row) => row.id)).toEqual(["t-mine"]);
  });
});

describe("revertAndDeleteTransactions", () => {
  it("reverts a transaction BEFORE deleting its row, for every transaction in the cascade", async () => {
    const { supabase, calls } = createSupabaseMock({
      accounts: [{ id: "cash", user_id: USER, balance: 0 }],
      transactions: [
        { id: "t-1", user_id: USER, related_entity_id: "sub-1", type: "expense", amount: 100, account_id: "cash" },
        { id: "t-2", user_id: USER, related_entity_id: "sub-1", type: "expense", amount: 50, account_id: "cash" }
      ]
    });
    const rows = [
      transaction({ id: "t-1", type: "expense", amount: 100, account_id: "cash", related_entity_id: "sub-1" }),
      transaction({ id: "t-2", type: "expense", amount: 50, account_id: "cash", related_entity_id: "sub-1" })
    ];

    await revertAndDeleteTransactions(client(supabase), USER, rows, messages);

    // The balance restore for each transaction must land before that same
    // transaction's row is deleted — reordering these would break the invariant.
    const restoreT1 = calls.findIndex((call) => call.op === "update" && call.table === "accounts");
    const deleteT1 = calls.findIndex((call) => call.op === "delete" && call.table === "transactions" && call.filters.id === "t-1");
    const restoreT2 = calls.findIndex((call, index) => index > deleteT1 && call.op === "update" && call.table === "accounts");
    const deleteT2 = calls.findIndex((call) => call.op === "delete" && call.table === "transactions" && call.filters.id === "t-2");

    expect(restoreT1).toBeGreaterThanOrEqual(0);
    expect(restoreT1).toBeLessThan(deleteT1);
    expect(restoreT2).toBeGreaterThan(deleteT1);
    expect(restoreT2).toBeLessThan(deleteT2);
  });

  it("restores the account balance of a reversed expense rather than only dropping the row", async () => {
    const { supabase, tables } = createSupabaseMock({
      accounts: [{ id: "cash", user_id: USER, balance: 400 }],
      transactions: [{ id: "t-1", user_id: USER, related_entity_id: "sub-1", type: "expense", amount: 100, account_id: "cash" }]
    });

    await revertAndDeleteTransactions(client(supabase), USER, [transaction({ id: "t-1", type: "expense", amount: 100, account_id: "cash" })], messages);

    expect(tables.accounts[0].balance).toBe(500);
    expect(tables.transactions).toEqual([]);
  });

  it("restores BOTH sides of an annual-expense sinking_fund_reserve transfer", async () => {
    const { supabase, tables } = createSupabaseMock({
      accounts: [
        { id: "cash", user_id: USER, balance: 700 },
        { id: "reserve", user_id: USER, balance: 300 }
      ],
      transactions: [{ id: "t-reserve", user_id: USER, related_entity_id: "annual-1", type: "sinking_fund_reserve", amount: 300, account_id: "cash", destination_account_id: "reserve" }]
    });

    await revertAndDeleteTransactions(
      client(supabase),
      USER,
      [transaction({ id: "t-reserve", type: "sinking_fund_reserve", amount: 300, account_id: "cash", destination_account_id: "reserve", related_entity_id: "annual-1" })],
      messages
    );

    const byId = new Map(tables.accounts.map((row) => [row.id, row.balance]));
    expect(byId.get("cash")).toBe(1000);
    expect(byId.get("reserve")).toBe(0);
  });

  it("removes the card_transactions child row when reversing a card expense", async () => {
    const { supabase, tables } = createSupabaseMock({
      card_transactions: [{ id: "ct-1", user_id: USER, transaction_id: "t-card", card_id: "card-1", amount: 250 }],
      debt_payments: [],
      transactions: [{ id: "t-card", user_id: USER, related_entity_id: "card-1", type: "credit_card_expense", amount: 250 }]
    });

    await revertAndDeleteTransactions(client(supabase), USER, [transaction({ id: "t-card", type: "credit_card_expense", amount: 250, related_entity_id: "card-1" })], messages);

    expect(tables.card_transactions).toEqual([]);
    expect(tables.transactions).toEqual([]);
  });

  it("aborts the whole cascade and leaves later rows intact when one reversal throws", async () => {
    // t-2 is a credit_card_expense with no card_transactions row, which
    // revertTransactionSideEffects refuses to reverse.
    const { supabase, tables } = createSupabaseMock({
      accounts: [{ id: "cash", user_id: USER, balance: 400 }],
      card_transactions: [],
      transactions: [
        { id: "t-1", user_id: USER, related_entity_id: "sub-1", type: "expense", amount: 100, account_id: "cash" },
        { id: "t-2", user_id: USER, related_entity_id: "sub-1", type: "credit_card_expense", amount: 250 },
        { id: "t-3", user_id: USER, related_entity_id: "sub-1", type: "expense", amount: 25, account_id: "cash" }
      ]
    });
    const rows = [
      transaction({ id: "t-1", type: "expense", amount: 100, account_id: "cash" }),
      transaction({ id: "t-2", type: "credit_card_expense", amount: 250 }),
      transaction({ id: "t-3", type: "expense", amount: 25, account_id: "cash" })
    ];

    await expect(revertAndDeleteTransactions(client(supabase), USER, rows, messages)).rejects.toThrow(messages.unsafeCardExpense);

    // The failure stops the loop: t-3 is never touched.
    expect(tables.transactions.map((row) => row.id)).toEqual(["t-2", "t-3"]);
  });
});

describe("findTransactionsForCard", () => {
  it("finds card-bound subscription and installment charges that related_entity_id alone would miss", async () => {
    const { supabase } = createSupabaseMock({
      card_transactions: [
        { id: "ct-standalone", user_id: USER, card_id: "card-1", transaction_id: "t-standalone" },
        // Auto-charges key off the subscription / debt id, not the card id.
        { id: "ct-sub", user_id: USER, card_id: "card-1", transaction_id: "t-sub-charge" },
        { id: "ct-installment", user_id: USER, card_id: "card-1", transaction_id: "t-installment-charge" },
        { id: "ct-other-card", user_id: USER, card_id: "card-2", transaction_id: "t-other-card" }
      ],
      card_payments: [{ id: "cp-1", user_id: USER, card_id: "card-1", transaction_id: "t-payment" }],
      transactions: [
        { id: "t-standalone", user_id: USER, related_entity_id: "card-1", type: "credit_card_expense", amount: 100 },
        { id: "t-sub-charge", user_id: USER, related_entity_id: "sub-9", type: "credit_card_expense", amount: 200 },
        { id: "t-installment-charge", user_id: USER, related_entity_id: "debt-9", type: "credit_card_expense", amount: 300 },
        { id: "t-payment", user_id: USER, related_entity_id: "card-1", type: "credit_card_payment", amount: 400 },
        { id: "t-other-card", user_id: USER, related_entity_id: "card-2", type: "credit_card_expense", amount: 500 }
      ]
    });

    const found = await findTransactionsForCard(client(supabase), USER, "card-1");

    expect(found.map((row) => row.id).sort()).toEqual(["t-installment-charge", "t-payment", "t-standalone", "t-sub-charge"]);
  });

  it("does not double-count a transaction reachable through both the child table and related_entity_id", async () => {
    const { supabase } = createSupabaseMock({
      card_transactions: [{ id: "ct-1", user_id: USER, card_id: "card-1", transaction_id: "t-1" }],
      card_payments: [],
      transactions: [{ id: "t-1", user_id: USER, related_entity_id: "card-1", type: "credit_card_expense", amount: 100 }]
    });

    const found = await findTransactionsForCard(client(supabase), USER, "card-1");

    expect(found).toHaveLength(1);
  });

  it("skips child rows with a null transaction_id, which this app never wrote", async () => {
    const { supabase } = createSupabaseMock({
      card_transactions: [{ id: "ct-orphan", user_id: USER, card_id: "card-1", transaction_id: null }],
      card_payments: [],
      transactions: []
    });

    const found = await findTransactionsForCard(client(supabase), USER, "card-1");

    expect(found).toEqual([]);
  });
});

describe("cascadeDeleteCreditCard", () => {
  it("deletes the credit_cards row LAST, after every linked transaction is reverted and removed", async () => {
    const { supabase, calls } = createSupabaseMock({
      accounts: [{ id: "cash", user_id: USER, balance: 1000 }],
      credit_cards: [{ id: "card-1", user_id: USER, name: "Main card" }],
      card_transactions: [{ id: "ct-1", user_id: USER, card_id: "card-1", transaction_id: "t-expense" }],
      card_payments: [{ id: "cp-1", user_id: USER, card_id: "card-1", transaction_id: "t-payment", account_id: "cash", amount: 400 }],
      debt_payments: [],
      debts: [],
      subscriptions: [],
      transactions: [
        { id: "t-expense", user_id: USER, related_entity_id: "card-1", type: "credit_card_expense", amount: 250 },
        { id: "t-payment", user_id: USER, related_entity_id: "card-1", type: "credit_card_payment", amount: 400, account_id: "cash" }
      ]
    });

    await cascadeDeleteCreditCard(client(supabase), USER, "card-1", messages);

    const cardDelete = calls.findIndex((call) => call.op === "delete" && call.table === "credit_cards");
    const transactionDeletes = calls.map((call, index) => ({ call, index })).filter(({ call }) => call.op === "delete" && call.table === "transactions").map(({ index }) => index);

    expect(cardDelete).toBeGreaterThanOrEqual(0);
    expect(transactionDeletes).toHaveLength(2);
    for (const index of transactionDeletes) expect(index).toBeLessThan(cardDelete);
  });

  it("restores the cash account behind a card payment before the card row is gone", async () => {
    const { supabase, tables } = createSupabaseMock({
      accounts: [{ id: "cash", user_id: USER, balance: 600 }],
      credit_cards: [{ id: "card-1", user_id: USER }],
      card_transactions: [],
      card_payments: [{ id: "cp-1", user_id: USER, card_id: "card-1", transaction_id: "t-payment", account_id: "cash", amount: 400 }],
      debts: [],
      subscriptions: [],
      transactions: [{ id: "t-payment", user_id: USER, related_entity_id: "card-1", type: "credit_card_payment", amount: 400, account_id: "cash" }]
    });

    await cascadeDeleteCreditCard(client(supabase), USER, "card-1", messages);

    expect(tables.accounts[0].balance).toBe(1000);
    expect(tables.card_payments).toEqual([]);
    expect(tables.credit_cards).toEqual([]);
  });

  it("refuses to delete a card that still has an installment linked, touching nothing", async () => {
    const { supabase, tables, calls } = createSupabaseMock({
      credit_cards: [{ id: "card-1", user_id: USER }],
      debts: [{ id: "debt-1", user_id: USER, card_id: "card-1", remaining_balance: 5000 }],
      subscriptions: [],
      card_transactions: [{ id: "ct-1", user_id: USER, card_id: "card-1", transaction_id: "t-1" }],
      card_payments: [],
      transactions: [{ id: "t-1", user_id: USER, related_entity_id: "card-1", type: "credit_card_expense", amount: 100 }]
    });

    await expect(cascadeDeleteCreditCard(client(supabase), USER, "card-1", messages)).rejects.toThrow(messages.cardHasLinkedDebts);

    expect(tables.credit_cards).toHaveLength(1);
    expect(tables.transactions).toHaveLength(1);
    expect(calls.some((call) => call.op === "delete")).toBe(false);
  });

  it("refuses to delete a card still used as a subscription payment source", async () => {
    const { supabase, tables } = createSupabaseMock({
      credit_cards: [{ id: "card-1", user_id: USER }],
      debts: [],
      subscriptions: [{ id: "sub-1", user_id: USER, source_card_id: "card-1", next_source_card_id: null }],
      card_transactions: [],
      card_payments: [],
      transactions: []
    });

    await expect(cascadeDeleteCreditCard(client(supabase), USER, "card-1", messages)).rejects.toThrow(messages.cardHasLinkedSubscriptions);

    expect(tables.credit_cards).toHaveLength(1);
  });

  it("refuses to delete a card scheduled as a subscription's NEXT payment source", async () => {
    const { supabase, tables } = createSupabaseMock({
      credit_cards: [{ id: "card-1", user_id: USER }],
      debts: [],
      subscriptions: [{ id: "sub-1", user_id: USER, source_card_id: "account-bound", next_source_card_id: "card-1" }],
      card_transactions: [],
      card_payments: [],
      transactions: []
    });

    await expect(cascadeDeleteCreditCard(client(supabase), USER, "card-1", messages)).rejects.toThrow(messages.cardHasLinkedSubscriptions);

    expect(tables.credit_cards).toHaveLength(1);
  });

  it("leaves the card row intact when a linked transaction cannot be reversed", async () => {
    // The card expense has no card_transactions row, so its reversal refuses.
    const { supabase, tables } = createSupabaseMock({
      credit_cards: [{ id: "card-1", user_id: USER }],
      debts: [],
      subscriptions: [],
      card_transactions: [],
      card_payments: [],
      transactions: [{ id: "t-1", user_id: USER, related_entity_id: "card-1", type: "credit_card_expense", amount: 100 }]
    });

    await expect(cascadeDeleteCreditCard(client(supabase), USER, "card-1", messages)).rejects.toThrow(messages.unsafeCardExpense);

    expect(tables.credit_cards).toHaveLength(1);
    expect(tables.transactions).toHaveLength(1);
  });

  it("deletes a card with no activity at all", async () => {
    const { supabase, tables } = createSupabaseMock({
      credit_cards: [{ id: "card-1", user_id: USER }],
      debts: [],
      subscriptions: [],
      card_transactions: [],
      card_payments: [],
      transactions: []
    });

    const removed = await cascadeDeleteCreditCard(client(supabase), USER, "card-1", messages as ReversalMessages & CardDeleteMessages);

    expect(removed).toBe(0);
    expect(tables.credit_cards).toEqual([]);
  });
});

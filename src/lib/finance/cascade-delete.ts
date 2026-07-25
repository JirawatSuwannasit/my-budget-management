import type { createClient } from "@/lib/supabase/server";
import { addDelta, applyAccountBalanceDeltas, getReverseAccountBalanceDeltas, reverseLinkedDebtPayments, updateDebtRemaining, type AccountBalanceDelta } from "./transaction-effects";
import type { TransactionType } from "./types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type TransactionRow = {
  id: string;
  account_id: string | null;
  destination_account_id: string | null;
  type: TransactionType;
  amount: number | string;
  transaction_date: string;
  cycle_start_date: string;
  related_entity_id: string | null;
  notes: string | null;
};

/** The subset of the transactions message namespace the reversal path can throw. */
export type ReversalMessages = {
  balanceBelowZero: string;
  unsafeCardExpense: string;
  unsafeCardPayment: string;
  unsafeDebtPayment: string;
};

/** Adds the two guard messages only the credit-card delete can throw. */
export type CardDeleteMessages = ReversalMessages & {
  cardHasLinkedDebts: string;
  cardHasLinkedSubscriptions: string;
};

async function deleteChildRows(supabase: SupabaseServer, userId: string, table: "card_transactions" | "card_payments" | "debt_payments", transactionId: string) {
  const { error } = await supabase.from(table).delete().eq("transaction_id", transactionId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Undoes everything a transaction wrote: its child row, its account balance
 * effect, and any debt paydown. Shared by the edit path, the single delete, and
 * the cascades, so all four stay in exact agreement on how a reversal works.
 */
export async function revertTransactionSideEffects(supabase: SupabaseServer, userId: string, transaction: TransactionRow, messages: ReversalMessages) {
  const amount = Number(transaction.amount);

  if (transaction.type === "credit_card_expense") {
    const { data, error } = await supabase.from("card_transactions").select("id").eq("transaction_id", transaction.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error(messages.unsafeCardExpense);
    // A card-linked installment's auto-charge is a credit_card_expense that also
    // carries a linked debt_payments paydown row (account_id null, written
    // directly by processDueInstallmentCharges rather than through the
    // debt_payment path). reverseLinkedDebtPayments restores remaining_balance
    // for it; it's a no-op for a plain card expense with no linked row.
    await Promise.all([deleteChildRows(supabase, userId, "card_transactions", transaction.id), reverseLinkedDebtPayments(supabase, userId, transaction.id)]);
    return;
  }

  if (transaction.type === "credit_card_payment") {
    const { data, error } = await supabase.from("card_payments").select("id,account_id,amount").eq("transaction_id", transaction.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error(messages.unsafeCardPayment);
    const deltas: AccountBalanceDelta[] = [];
    for (const payment of data) addDelta(deltas, payment.account_id, Number(payment.amount));
    await Promise.all([applyAccountBalanceDeltas(supabase, userId, deltas, messages.balanceBelowZero), deleteChildRows(supabase, userId, "card_payments", transaction.id)]);
    return;
  }

  if (transaction.type === "debt_payment") {
    const { data, error } = await supabase.from("debt_payments").select("id,account_id,debt_id,amount").eq("transaction_id", transaction.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error(messages.unsafeDebtPayment);
    const deltas: AccountBalanceDelta[] = [];
    for (const payment of data) addDelta(deltas, payment.account_id, Number(payment.amount));
    await Promise.all([
      applyAccountBalanceDeltas(supabase, userId, deltas, messages.balanceBelowZero),
      ...data.map((payment) => updateDebtRemaining(supabase, userId, payment.debt_id, Number(payment.amount))),
      deleteChildRows(supabase, userId, "debt_payments", transaction.id)
    ]);
    return;
  }

  await applyAccountBalanceDeltas(supabase, userId, getReverseAccountBalanceDeltas({ type: transaction.type, amount, accountId: transaction.account_id, destinationAccountId: transaction.destination_account_id }), messages.balanceBelowZero);
}

/**
 * Shared core of every cascade delete: reverses each transaction through
 * `revertTransactionSideEffects` — so `card_transactions` / `card_payments` /
 * `debt_payments` children are removed and account balances (plus
 * `debts.remaining_balance`) are restored, which a direct DELETE on
 * `transactions` would strand — then deletes its row.
 *
 * Reversals run sequentially, not in parallel: several linked transactions can
 * touch the same account, and `applyAccountBalanceDeltas` is a read-modify-write,
 * so concurrent reversals would lose updates. Each transaction's reversal fully
 * completes before its own row is deleted, and any failure propagates so the
 * caller aborts before deleting the parent row — a partial cascade is worse
 * than none.
 */
export async function revertAndDeleteTransactions(supabase: SupabaseServer, userId: string, transactions: TransactionRow[], messages: ReversalMessages): Promise<number> {
  for (const transaction of transactions) {
    await revertTransactionSideEffects(supabase, userId, transaction, messages);
    const { error } = await supabase.from("transactions").delete().eq("id", transaction.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
  return transactions.length;
}

/**
 * Every transaction linked to a planning entity (subscription / annual expense),
 * across all cycles. Annual-expense `sinking_fund_reserve` rows carry the entity
 * id too and are real source -> reserve transfers, so they reverse through the
 * same generic path, restoring both sides.
 */
export async function findTransactionsForRelatedEntity(supabase: SupabaseServer, userId: string, relatedEntityId: string): Promise<TransactionRow[]> {
  const { data, error } = await supabase.from("transactions").select("*").eq("related_entity_id", relatedEntityId).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as TransactionRow[];
}

/**
 * Every transaction booked on a credit card.
 *
 * Matching on `related_entity_id` alone is NOT enough. `buildPayload` only sets
 * it to the card id for a standalone card expense and for a card payment; a
 * card-bound subscription's auto-charge carries the subscription id and a
 * card-linked installment's carries the debt id. All of them still own a
 * `card_transactions` / `card_payments` row on this card, so the child tables
 * are the authoritative linkage and are unioned with the `related_entity_id`
 * match.
 *
 * `transaction_id` on both child tables is nullable (rows not written by this
 * app), so unlinked rows are skipped: they carry no transaction or balance
 * effect to reverse.
 */
export async function findTransactionsForCard(supabase: SupabaseServer, userId: string, cardId: string): Promise<TransactionRow[]> {
  const [cardExpenses, cardPayments, relatedDirect] = await Promise.all([
    supabase.from("card_transactions").select("transaction_id").eq("card_id", cardId).eq("user_id", userId),
    supabase.from("card_payments").select("transaction_id").eq("card_id", cardId).eq("user_id", userId),
    supabase.from("transactions").select("id").eq("related_entity_id", cardId).eq("user_id", userId)
  ]);
  if (cardExpenses.error) throw new Error(cardExpenses.error.message);
  if (cardPayments.error) throw new Error(cardPayments.error.message);
  if (relatedDirect.error) throw new Error(relatedDirect.error.message);

  const transactionIds = [
    ...new Set(
      [
        ...(cardExpenses.data ?? []).map((row) => row.transaction_id),
        ...(cardPayments.data ?? []).map((row) => row.transaction_id),
        ...(relatedDirect.data ?? []).map((row) => row.id)
      ].filter((value): value is string => Boolean(value))
    )
  ];
  if (transactionIds.length === 0) return [];

  const { data, error } = await supabase.from("transactions").select("*").in("id", transactionIds).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as TransactionRow[];
}

/**
 * Refuses the delete while anything is still bound to the card.
 *
 * `debts.card_id` and `subscriptions.source_card_id` / `next_source_card_id` are
 * ON DELETE SET NULL, so deleting a bound card would silently unlink an
 * installment or leave a subscription sourceless — and the damage would only
 * surface later, as an auto-charge that skips with no explanation.
 */
export async function assertCardNotInUse(supabase: SupabaseServer, userId: string, cardId: string, messages: CardDeleteMessages): Promise<void> {
  const [linkedDebts, linkedSubscriptions] = await Promise.all([
    supabase.from("debts").select("id", { count: "exact", head: true }).eq("card_id", cardId).eq("user_id", userId),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId).or("source_card_id.eq." + cardId + ",next_source_card_id.eq." + cardId)
  ]);
  if (linkedDebts.error) throw new Error(linkedDebts.error.message);
  if (linkedSubscriptions.error) throw new Error(linkedSubscriptions.error.message);
  if ((linkedDebts.count ?? 0) > 0) throw new Error(messages.cardHasLinkedDebts);
  if ((linkedSubscriptions.count ?? 0) > 0) throw new Error(messages.cardHasLinkedSubscriptions);
}

/**
 * Guard, then cascade, then delete the card row — in that order.
 *
 * The order is load-bearing: `card_transactions.card_id` and
 * `card_payments.card_id` are ON DELETE CASCADE, so if the card row went first
 * Postgres would drop those child rows while their parent `transactions` rows
 * survived, stranding card float and never restoring the cash accounts behind
 * any card payment.
 */
export async function cascadeDeleteCreditCard(supabase: SupabaseServer, userId: string, cardId: string, messages: CardDeleteMessages): Promise<number> {
  await assertCardNotInUse(supabase, userId, cardId, messages);

  const transactions = await findTransactionsForCard(supabase, userId, cardId);
  const removed = await revertAndDeleteTransactions(supabase, userId, transactions, messages);

  const { error } = await supabase.from("credit_cards").delete().eq("id", cardId).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return removed;
}

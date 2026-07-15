import type { CycleTransactionLink } from "./subscription-charges";

// Lazy materialization (no scheduler in this stack): on app open we compute which
// active, card-linked installments still have a remaining balance and haven't
// been charged to their card yet this cycle. Every cycle charges into the card
// float exactly like a card-bound subscription; charging never overshoots the
// remaining balance, so the final cycle takes only the rounding remainder and
// the total charged across all cycles is exactly the original amount.

export type ChargeableInstallment = {
  id: string;
  type: string;
  card_id: string | null;
  category_id: string | null;
  monthly_payment: number | string;
  remaining_balance: number | string;
  active: boolean | null;
};

export type DueInstallmentCharge = {
  debtId: string;
  cardId: string;
  categoryId: string | null;
  amount: number;
};

type SelectDueParams = {
  installments: ChargeableInstallment[];
  cycleTransactions: CycleTransactionLink[];
  cycleStart: Date;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// Pure selection logic, deliberately separate from any Supabase I/O so it can be
// unit tested directly. Correctness invariants: chargeAmount = min(monthly_payment,
// remaining_balance), so the last cycle takes whatever remains and the sum of all
// charges equals the original amount exactly, never overshooting; a debt with
// remaining_balance <= 0 is never selected (the stop condition); and idempotency —
// an installment already linked to a transaction this cycle (related_entity_id ===
// debt.id) is excluded, so re-running mid-cycle after a successful charge selects
// nothing further for it.
export function selectDueInstallmentCharges({ installments, cycleTransactions, cycleStart }: SelectDueParams): DueInstallmentCharge[] {
  const cycleStartKey = toDateInput(cycleStart);
  const linkedIds = new Set(
    cycleTransactions
      .filter((transaction) => transaction.cycle_start_date === cycleStartKey)
      .map((transaction) => transaction.related_entity_id)
      .filter((id): id is string => Boolean(id))
  );

  const due: DueInstallmentCharge[] = [];
  for (const installment of installments) {
    if (installment.active === false) continue;
    if (installment.type !== "installment") continue;
    if (!installment.card_id) continue;
    const remaining = toNumber(installment.remaining_balance);
    if (remaining <= 0) continue;
    if (linkedIds.has(installment.id)) continue;

    const amount = Math.min(toNumber(installment.monthly_payment), remaining);
    if (amount <= 0) continue;
    due.push({ debtId: installment.id, cardId: installment.card_id, categoryId: installment.category_id, amount });
  }
  return due;
}

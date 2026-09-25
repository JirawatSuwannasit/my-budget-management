import { getCardBillingPeriodStart } from "./cycle";

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
  billing_cut_day: number;
};

export type InstallmentChargeTransaction = {
  related_entity_id: string | null;
  transaction_date: string;
};

export type DueInstallmentCharge = {
  debtId: string;
  cardId: string;
  categoryId: string | null;
  amount: number;
};

type SelectDueParams = {
  installments: ChargeableInstallment[];
  chargeTransactions: InstallmentChargeTransaction[];
  today: Date;
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

// Pure selection logic, deliberately separate from Supabase I/O. Installments
// advance once per CREDIT-CARD statement period, not once per personal budget
// cycle. Those boundaries can differ (for example budget cycle 25th, card cut
// 30th); using the budget cycle can accidentally post two installments into one
// statement. The DB RPC repeats the same period guard for concurrency safety.
export function selectDueInstallmentCharges({ installments, chargeTransactions, today }: SelectDueParams): DueInstallmentCharge[] {
  const todayKey = toDateInput(today);
  const due: DueInstallmentCharge[] = [];

  for (const installment of installments) {
    if (installment.active === false) continue;
    if (installment.type !== "installment") continue;
    if (!installment.card_id) continue;
    if (!Number.isInteger(installment.billing_cut_day) || installment.billing_cut_day < 1 || installment.billing_cut_day > 31) continue;

    const remaining = toNumber(installment.remaining_balance);
    if (remaining <= 0) continue;

    const periodStartKey = toDateInput(getCardBillingPeriodStart(today, installment.billing_cut_day));
    const alreadyChargedThisStatement = chargeTransactions.some(
      (transaction) =>
        transaction.related_entity_id === installment.id &&
        transaction.transaction_date >= periodStartKey &&
        transaction.transaction_date <= todayKey
    );
    if (alreadyChargedThisStatement) continue;

    const amount = Math.min(toNumber(installment.monthly_payment), remaining);
    if (amount <= 0) continue;
    due.push({ debtId: installment.id, cardId: installment.card_id, categoryId: installment.category_id, amount });
  }

  return due;
}

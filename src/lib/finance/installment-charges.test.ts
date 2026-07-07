import { describe, expect, it } from "vitest";
import { selectDueInstallmentCharges, type ChargeableInstallment } from "./installment-charges";
import type { CycleTransactionLink } from "./subscription-charges";

const cycle1Start = new Date(2026, 6, 25, 12); // Jul 25
const cycle2Start = new Date(2026, 7, 25, 12); // Aug 25
const cycle3Start = new Date(2026, 8, 25, 12); // Sep 25

function installment(overrides: Partial<ChargeableInstallment> = {}): ChargeableInstallment {
  return {
    id: "debt-1",
    type: "installment",
    card_id: "card-1",
    monthly_payment: "396",
    remaining_balance: "792",
    active: true,
    ...overrides
  };
}

describe("selectDueInstallmentCharges", () => {
  it("charges the monthly amount for an active card-linked installment with a remaining balance", () => {
    const due = selectDueInstallmentCharges({ installments: [installment()], cycleTransactions: [], cycleStart: cycle1Start });
    expect(due).toEqual([{ debtId: "debt-1", cardId: "card-1", amount: 396 }]);
  });

  it("splits a 792/2-month installment across two cycles and stops on the third once the balance is cleared", () => {
    // Cycle 1: full balance, charges the monthly amount.
    const cycle1 = selectDueInstallmentCharges({ installments: [installment({ remaining_balance: "792" })], cycleTransactions: [], cycleStart: cycle1Start });
    expect(cycle1).toEqual([{ debtId: "debt-1", cardId: "card-1", amount: 396 }]);

    // Cycle 2: remaining balance after cycle 1's charge, fresh cycle transactions.
    const cycle2 = selectDueInstallmentCharges({ installments: [installment({ remaining_balance: "396" })], cycleTransactions: [], cycleStart: cycle2Start });
    expect(cycle2).toEqual([{ debtId: "debt-1", cardId: "card-1", amount: 396 }]);

    // Cycle 3: balance reached zero after cycle 2's charge — never charge past it.
    const cycle3 = selectDueInstallmentCharges({ installments: [installment({ remaining_balance: "0" })], cycleTransactions: [], cycleStart: cycle3Start });
    expect(cycle3).toHaveLength(0);
  });

  it("never overshoots a non-evenly-divisible total: charges sum exactly to the original amount, the final cycle taking the remainder", () => {
    const monthlyPayment = Math.round((1000 / 3) * 100) / 100; // 333.33
    let remaining = 1000;
    let totalCharged = 0;
    let cycles = 0;
    const maxCycles = 10; // guard against an infinite loop if the invariant breaks

    while (remaining > 0 && cycles < maxCycles) {
      const due = selectDueInstallmentCharges({
        installments: [installment({ monthly_payment: monthlyPayment, remaining_balance: remaining })],
        cycleTransactions: [],
        cycleStart: cycle1Start
      });
      expect(due).toHaveLength(1);
      const charge = due[0].amount;
      expect(charge).toBeLessThanOrEqual(remaining);
      totalCharged += charge;
      remaining = Math.round((remaining - charge) * 100) / 100; // mirrors the numeric(14,2) column between cycles
      cycles += 1;
    }

    expect(remaining).toBe(0);
    expect(Math.round(totalCharged * 100) / 100).toBe(1000);
  });

  it("is idempotent: an installment already linked to a transaction this cycle is not charged again", () => {
    const first = selectDueInstallmentCharges({ installments: [installment()], cycleTransactions: [], cycleStart: cycle1Start });
    expect(first).toHaveLength(1);

    const cycleTransactions: CycleTransactionLink[] = [{ related_entity_id: "debt-1", cycle_start_date: "2026-07-25" }];
    const second = selectDueInstallmentCharges({ installments: [installment()], cycleTransactions, cycleStart: cycle1Start });
    expect(second).toHaveLength(0);
  });

  it("ignores a transaction linked in a different cycle", () => {
    const cycleTransactions: CycleTransactionLink[] = [{ related_entity_id: "debt-1", cycle_start_date: "2026-06-25" }];
    const due = selectDueInstallmentCharges({ installments: [installment()], cycleTransactions, cycleStart: cycle1Start });
    expect(due).toHaveLength(1);
  });

  it("skips a cleared installment (remaining_balance is zero)", () => {
    const due = selectDueInstallmentCharges({ installments: [installment({ remaining_balance: 0 })], cycleTransactions: [], cycleStart: cycle1Start });
    expect(due).toHaveLength(0);
  });

  it("skips an inactive installment", () => {
    const due = selectDueInstallmentCharges({ installments: [installment({ active: false })], cycleTransactions: [], cycleStart: cycle1Start });
    expect(due).toHaveLength(0);
  });

  it("skips a debt that is not an installment", () => {
    const due = selectDueInstallmentCharges({ installments: [installment({ type: "personal_loan" })], cycleTransactions: [], cycleStart: cycle1Start });
    expect(due).toHaveLength(0);
  });

  it("skips an installment with no card link", () => {
    const due = selectDueInstallmentCharges({ installments: [installment({ card_id: null })], cycleTransactions: [], cycleStart: cycle1Start });
    expect(due).toHaveLength(0);
  });
});

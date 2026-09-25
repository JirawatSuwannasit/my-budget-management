import { describe, expect, it } from "vitest";
import { selectDueInstallmentCharges, type ChargeableInstallment, type InstallmentChargeTransaction } from "./installment-charges";

const sep1 = new Date(2026, 8, 1, 12);
const sep25 = new Date(2026, 8, 25, 12);
const oct1 = new Date(2026, 9, 1, 12);

function installment(overrides: Partial<ChargeableInstallment> = {}): ChargeableInstallment {
  return {
    id: "debt-1",
    type: "installment",
    card_id: "card-1",
    category_id: "cat-1",
    monthly_payment: "396",
    remaining_balance: "792",
    active: true,
    billing_cut_day: 30,
    ...overrides
  };
}

describe("selectDueInstallmentCharges", () => {
  it("charges the monthly amount for an active card-linked installment", () => {
    const due = selectDueInstallmentCharges({ installments: [installment()], chargeTransactions: [], today: sep1 });
    expect(due).toEqual([{ debtId: "debt-1", cardId: "card-1", categoryId: "cat-1", amount: 396 }]);
  });

  it("does not post a second installment in the same card statement period even when the personal budget cycle changes", () => {
    const existing: InstallmentChargeTransaction[] = [
      { related_entity_id: "debt-1", transaction_date: "2026-09-01" }
    ];

    const due = selectDueInstallmentCharges({
      installments: [installment({ remaining_balance: "396" })],
      chargeTransactions: existing,
      today: sep25
    });

    expect(due).toHaveLength(0);
  });

  it("allows the next installment after the card cut starts a new statement period", () => {
    const existing: InstallmentChargeTransaction[] = [
      { related_entity_id: "debt-1", transaction_date: "2026-09-01" }
    ];

    const due = selectDueInstallmentCharges({
      installments: [installment({ remaining_balance: "396" })],
      chargeTransactions: existing,
      today: oct1
    });

    expect(due).toEqual([{ debtId: "debt-1", cardId: "card-1", categoryId: "cat-1", amount: 396 }]);
  });

  it("treats the cut day itself as part of the statement ending that day", () => {
    const existing: InstallmentChargeTransaction[] = [
      { related_entity_id: "debt-1", transaction_date: "2026-09-01" }
    ];

    const due = selectDueInstallmentCharges({
      installments: [installment({ remaining_balance: "396" })],
      chargeTransactions: existing,
      today: new Date(2026, 8, 30, 12)
    });

    expect(due).toHaveLength(0);
  });

  it("propagates the fixed category to each due charge", () => {
    const due = selectDueInstallmentCharges({
      installments: [installment({ category_id: "cat-groceries" })],
      chargeTransactions: [],
      today: sep1
    });
    expect(due[0].categoryId).toBe("cat-groceries");
  });

  it("never overshoots the remaining amount", () => {
    const due = selectDueInstallmentCharges({
      installments: [installment({ monthly_payment: 333.33, remaining_balance: 0.01 })],
      chargeTransactions: [],
      today: sep1
    });
    expect(due[0].amount).toBe(0.01);
  });

  it("skips a cleared installment", () => {
    const due = selectDueInstallmentCharges({ installments: [installment({ remaining_balance: 0 })], chargeTransactions: [], today: sep1 });
    expect(due).toHaveLength(0);
  });

  it("skips inactive, non-installment, unlinked, or invalid-card-cycle rows", () => {
    expect(selectDueInstallmentCharges({ installments: [installment({ active: false })], chargeTransactions: [], today: sep1 })).toHaveLength(0);
    expect(selectDueInstallmentCharges({ installments: [installment({ type: "personal_loan" })], chargeTransactions: [], today: sep1 })).toHaveLength(0);
    expect(selectDueInstallmentCharges({ installments: [installment({ card_id: null })], chargeTransactions: [], today: sep1 })).toHaveLength(0);
    expect(selectDueInstallmentCharges({ installments: [installment({ billing_cut_day: 0 })], chargeTransactions: [], today: sep1 })).toHaveLength(0);
  });
});

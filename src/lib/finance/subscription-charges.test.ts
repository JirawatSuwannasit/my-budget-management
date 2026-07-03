import { describe, expect, it } from "vitest";
import { selectDueSubscriptionCharges, type ChargeableSubscription, type CycleTransactionLink } from "./subscription-charges";

const cycleStart = new Date(2026, 6, 25, 12);
const cycleEnd = new Date(2026, 7, 24, 12);
const today = new Date(2026, 7, 10, 9); // Aug 10, after an Aug 5 billing day but within the cycle

function subscription(overrides: Partial<ChargeableSubscription> = {}): ChargeableSubscription {
  return {
    id: "sub-1",
    category_id: "cat-1",
    price: "199",
    billing_day: 5,
    frequency: "monthly",
    active: true,
    source_account_id: "acct-1",
    source_card_id: null,
    ...overrides
  };
}

describe("selectDueSubscriptionCharges", () => {
  it("selects an active monthly subscription bound to a source once its billing day has arrived and it is unlinked", () => {
    const due = selectDueSubscriptionCharges({ subscriptions: [subscription()], cycleTransactions: [], cycleStart, cycleEnd, today });
    expect(due).toEqual([{ subscriptionId: "sub-1", categoryId: "cat-1", amount: 199, sourceKind: "account", sourceId: "acct-1" }]);
  });

  it("is idempotent: re-running after the charge lands as a linked transaction this cycle selects nothing", () => {
    const first = selectDueSubscriptionCharges({ subscriptions: [subscription()], cycleTransactions: [], cycleStart, cycleEnd, today });
    expect(first).toHaveLength(1);

    // Simulate the charge having been posted: a transaction now links this
    // subscription in the current cycle, exactly what saveTransaction would produce.
    const cycleTransactions: CycleTransactionLink[] = [{ related_entity_id: "sub-1", cycle_start_date: "2026-07-25" }];
    const second = selectDueSubscriptionCharges({ subscriptions: [subscription()], cycleTransactions, cycleStart, cycleEnd, today });
    expect(second).toHaveLength(0);
  });

  it("ignores a transaction linked in a different cycle", () => {
    const cycleTransactions: CycleTransactionLink[] = [{ related_entity_id: "sub-1", cycle_start_date: "2026-06-25" }];
    const due = selectDueSubscriptionCharges({ subscriptions: [subscription()], cycleTransactions, cycleStart, cycleEnd, today });
    expect(due).toHaveLength(1);
  });

  it("does not select a subscription whose billing day has not arrived yet", () => {
    const notYetDue = new Date(2026, 6, 30, 9); // Jul 30, before the Aug 5 billing day
    const due = selectDueSubscriptionCharges({ subscriptions: [subscription()], cycleTransactions: [], cycleStart, cycleEnd, today: notYetDue });
    expect(due).toHaveLength(0);
  });

  it("skips yearly subscriptions (out of scope for auto-charge this round)", () => {
    const due = selectDueSubscriptionCharges({ subscriptions: [subscription({ frequency: "yearly" })], cycleTransactions: [], cycleStart, cycleEnd, today });
    expect(due).toHaveLength(0);
  });

  it("skips inactive subscriptions", () => {
    const due = selectDueSubscriptionCharges({ subscriptions: [subscription({ active: false })], cycleTransactions: [], cycleStart, cycleEnd, today });
    expect(due).toHaveLength(0);
  });

  it("skips subscriptions with no bound source (legacy)", () => {
    const due = selectDueSubscriptionCharges({ subscriptions: [subscription({ source_account_id: null })], cycleTransactions: [], cycleStart, cycleEnd, today });
    expect(due).toHaveLength(0);
  });

  it("prefers a bound card over a bound account and marks it credit_card_expense-bound", () => {
    const due = selectDueSubscriptionCharges({
      subscriptions: [subscription({ source_account_id: "acct-1", source_card_id: "card-1" })],
      cycleTransactions: [],
      cycleStart,
      cycleEnd,
      today
    });
    expect(due).toEqual([{ subscriptionId: "sub-1", categoryId: "cat-1", amount: 199, sourceKind: "card", sourceId: "card-1" }]);
  });
});

import { describe, expect, it } from "vitest";
import { selectSubscriptionSourcePromotions, type ScheduledSourceSubscription } from "./subscription-source-promotion";

const cycleStart = new Date(2026, 7, 25, 12); // Aug 25, 2026

function scheduled(overrides: Partial<ScheduledSourceSubscription> = {}): ScheduledSourceSubscription {
  return {
    id: "sub-1",
    next_source_account_id: "acct-2",
    next_source_card_id: null,
    next_source_effective_from: "2026-08-25",
    ...overrides
  };
}

describe("selectSubscriptionSourcePromotions", () => {
  it("promotes a scheduled change once its effective cycle has started", () => {
    const promotions = selectSubscriptionSourcePromotions({ subscriptions: [scheduled()], cycleStart });
    expect(promotions).toEqual([{ subscriptionId: "sub-1", sourceAccountId: "acct-2", sourceCardId: null }]);
  });

  it("does not promote a change scheduled for a later cycle", () => {
    const promotions = selectSubscriptionSourcePromotions({ subscriptions: [scheduled({ next_source_effective_from: "2026-09-25" })], cycleStart });
    expect(promotions).toHaveLength(0);
  });

  it("promotes a change scheduled for a cycle already in the past (never promoted while it should have been)", () => {
    const promotions = selectSubscriptionSourcePromotions({ subscriptions: [scheduled({ next_source_effective_from: "2026-07-25" })], cycleStart });
    expect(promotions).toHaveLength(1);
  });

  it("is idempotent: re-running after promotion has cleared the schedule finds nothing left to promote", () => {
    const first = selectSubscriptionSourcePromotions({ subscriptions: [scheduled()], cycleStart });
    expect(first).toHaveLength(1);

    // Simulate what the caller does after a successful promotion: copy
    // next_source_* into source_* and clear the schedule.
    const promoted: ScheduledSourceSubscription = { ...scheduled(), next_source_account_id: null, next_source_card_id: null, next_source_effective_from: null };
    const second = selectSubscriptionSourcePromotions({ subscriptions: [promoted], cycleStart });
    expect(second).toHaveLength(0);
  });

  it("ignores a row with no pending schedule", () => {
    const promotions = selectSubscriptionSourcePromotions({
      subscriptions: [scheduled({ next_source_account_id: null, next_source_card_id: null, next_source_effective_from: null })],
      cycleStart
    });
    expect(promotions).toHaveLength(0);
  });

  it("selects a card-bound scheduled change the same way as an account-bound one", () => {
    const promotions = selectSubscriptionSourcePromotions({
      subscriptions: [scheduled({ next_source_account_id: null, next_source_card_id: "card-9" })],
      cycleStart
    });
    expect(promotions).toEqual([{ subscriptionId: "sub-1", sourceAccountId: null, sourceCardId: "card-9" }]);
  });
});

// A subscription's payment-source change can be scheduled to take effect at the
// start of the NEXT billing cycle (source_* stays authoritative for the current
// cycle's charge until then). Promotion is applied lazily on app open, so this
// selection must be idempotent: once a row is promoted, next_source_effective_from
// is cleared, and re-running the same selection against that state finds nothing
// left to promote for it.

export type ScheduledSourceSubscription = {
  id: string;
  next_source_account_id: string | null;
  next_source_card_id: string | null;
  next_source_effective_from: string | null;
};

export type SourcePromotion = {
  subscriptionId: string;
  sourceAccountId: string | null;
  sourceCardId: string | null;
};

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// Never promotes early: a next_source_effective_from later than the cycle that
// just started is left untouched until a cycle reaches (or passes) it.
export function selectSubscriptionSourcePromotions({ subscriptions, cycleStart }: { subscriptions: ScheduledSourceSubscription[]; cycleStart: Date }): SourcePromotion[] {
  const cycleStartKey = toDateInput(cycleStart);
  const promotions: SourcePromotion[] = [];
  for (const subscription of subscriptions) {
    if (!subscription.next_source_effective_from) continue;
    if (!subscription.next_source_account_id && !subscription.next_source_card_id) continue;
    if (subscription.next_source_effective_from > cycleStartKey) continue;
    promotions.push({
      subscriptionId: subscription.id,
      sourceAccountId: subscription.next_source_account_id,
      sourceCardId: subscription.next_source_card_id
    });
  }
  return promotions;
}

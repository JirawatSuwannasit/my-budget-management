import { describe, expect, it } from "vitest";
import { buildUpcomingItems, DUE_SOON_DAYS } from "./upcoming";
import type { DashboardRows } from "./dashboard-data";

function rows(overrides: Partial<DashboardRows> = {}): DashboardRows {
  return {
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    subscriptions: [],
    annualExpenses: [],
    debts: [],
    debtPayments: [],
    creditCards: [],
    cardPayments: [],
    cardTransactions: [],
    ...overrides
  };
}

// Cycle: 25 Jul 2026 - 24 Aug 2026, "today" = 5 Aug 2026.
const cycleStart = new Date(2026, 6, 25, 12);
const cycleEnd = new Date(2026, 7, 24, 12);
const today = new Date(2026, 7, 5, 9);

// All fixture cards below cut on the 25th; since today (Aug 5) is before the
// 25th, the last cut is always Jul 25 and a transaction dated before it is
// billed. That makes the derived due date exactly "2026-08-<paymentDueDay>"
// (the due day rolls into the month after the cut), so paymentDueDay alone
// controls the resulting due date for these tests.
function billedCard(id: string, name: string, paymentDueDay: number, amount = "12000") {
  return {
    card: { id, name, billing_cut_day: 25, payment_due_day: paymentDueDay, active: true },
    cardTransactions: [{ id: id + "-txn", card_id: id, amount, transaction_date: "2026-07-20" }]
  };
}

describe("buildUpcomingItems", () => {
  it("reports all caught up when there is nothing to do", () => {
    const summary = buildUpcomingItems({ rows: rows(), cycleStart, cycleEnd, today });

    expect(summary.allCaughtUp).toBe(true);
    expect(summary.items).toHaveLength(0);
    expect(summary.urgentCount).toBe(0);
  });

  it("classifies a card's billed due date as overdue, due-soon, or pending", () => {
    // All three cards cut on the 25th (last cut = Jul 25, since today is Aug 5),
    // so the derived due date is exactly "2026-08-<paymentDueDay>" for each.
    const overdue = billedCard("overdue-card", "Overdue card", 1);
    const soon = billedCard("soon-card", "Soon card", 10);
    const later = billedCard("later-card", "Later card", 20);
    const summary = buildUpcomingItems({
      rows: rows({
        creditCards: [overdue.card, soon.card, later.card],
        cardTransactions: [...overdue.cardTransactions, ...soon.cardTransactions, ...later.cardTransactions]
      }),
      cycleStart,
      cycleEnd,
      today
    });

    const byId = new Map(summary.items.map((item) => [item.id, item.urgency]));
    expect(byId.get("card-overdue-card")).toBe("overdue");
    expect(byId.get("card-soon-card")).toBe("due-soon");
    expect(byId.get("card-later-card")).toBe("pending");
    expect(summary.overdueCount).toBe(1);
    expect(summary.dueSoonCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.urgentByHref["/debts-cards"]).toBe(2);
  });

  it("honors the due-soon window boundary", () => {
    const boundaryDueDay = 5 + DUE_SOON_DAYS; // exactly DUE_SOON_DAYS ahead of today (Aug 5)
    const edge = billedCard("card", "Card", boundaryDueDay, "100");
    const summary = buildUpcomingItems({
      rows: rows({ creditCards: [edge.card], cardTransactions: edge.cardTransactions }),
      cycleStart,
      cycleEnd,
      today
    });

    expect(summary.items[0].urgency).toBe("due-soon");
  });

  it("excludes cards whose billed balance is fully paid", () => {
    const card = billedCard("card", "Card", 1, "100");
    const summary = buildUpcomingItems({
      rows: rows({
        creditCards: [card.card],
        cardTransactions: card.cardTransactions,
        cardPayments: [{ id: "pay", card_id: "card", amount: "100" }]
      }),
      cycleStart,
      cycleEnd,
      today
    });

    expect(summary.allCaughtUp).toBe(true);
  });

  it("lists an unpaid monthly subscription with a due date from its billing day", () => {
    const summary = buildUpcomingItems({
      rows: rows({
        subscriptions: [{ id: "ai", name: "AI tools", frequency: "monthly", price: "2200", billing_day: 5, active: true }]
      }),
      cycleStart,
      cycleEnd,
      today
    });

    const item = summary.items.find((entry) => entry.id === "subscription-ai");
    expect(item?.type).toBe("subscription");
    expect(item?.amount).toBe(2200);
    expect(item?.dueDate).toBe("2026-08-05");
    expect(item?.urgency).toBe("due-soon");
    expect(item?.href).toBe("/planning");
  });

  it("drops a monthly subscription once it has been paid this cycle", () => {
    const summary = buildUpcomingItems({
      rows: rows({
        subscriptions: [{ id: "ai", name: "AI tools", frequency: "monthly", price: "2200", billing_day: 5, active: true }],
        transactions: [{ id: "pay", account_id: "main", category_id: null, type: "expense", amount: "2200", transaction_date: "2026-08-05", cycle_start_date: "2026-07-25", related_entity_id: "ai" }]
      }),
      cycleStart,
      cycleEnd,
      today
    });

    expect(summary.allCaughtUp).toBe(true);
  });

  it("lists a pending sinking-fund reserve for a yearly subscription and an annual expense", () => {
    const summary = buildUpcomingItems({
      rows: rows({
        subscriptions: [{ id: "football", name: "Football", frequency: "yearly", price: "4200", billing_day: 1, active: true }],
        annualExpenses: [{ id: "condo", name: "Condo fee", annual_amount: "12000", monthly_reserve: "1000", due_date: null, active: true }]
      }),
      cycleStart,
      cycleEnd,
      today
    });

    const reserve = summary.items.find((item) => item.id === "reserve-annual-condo");
    expect(reserve?.type).toBe("sinking_fund");
    expect(reserve?.amount).toBe(1000);
    expect(reserve?.urgency).toBe("pending");
    expect(summary.items.find((item) => item.id === "reserve-sub-football")?.amount).toBe(350);
    expect(summary.urgentCount).toBe(0);
    expect(summary.allCaughtUp).toBe(false);
  });

  it("surfaces an annual bill when its due date approaches and skips its reserve todo", () => {
    const summary = buildUpcomingItems({
      rows: rows({
        annualExpenses: [{ id: "condo", name: "Condo fee", annual_amount: "12000", monthly_reserve: "1000", due_date: "2026-08-08", active: true }]
      }),
      cycleStart,
      cycleEnd,
      today
    });

    expect(summary.items).toHaveLength(1);
    expect(summary.items[0].id).toBe("annual-bill-condo");
    expect(summary.items[0].urgency).toBe("due-soon");
    expect(summary.items[0].amount).toBe(12000);
  });

  it("lists a debt whose monthly payment is not yet recorded and clears once paid", () => {
    const debtRows = rows({
      debts: [{ id: "d1", name: "Main debt", remaining_balance: "500000", monthly_payment: "9000", active: true }]
    });
    const pending = buildUpcomingItems({ rows: debtRows, cycleStart, cycleEnd, today });
    expect(pending.items.find((item) => item.id === "debt-d1")?.amount).toBe(9000);

    const paid = buildUpcomingItems({
      rows: rows({
        debts: [{ id: "d1", name: "Main debt", remaining_balance: "491000", monthly_payment: "9000", active: true }],
        debtPayments: [{ id: "p", debt_id: "d1", amount: "9000", paid_date: "2026-08-01" }]
      }),
      cycleStart,
      cycleEnd,
      today
    });
    expect(paid.allCaughtUp).toBe(true);
  });

  it("sorts overdue before due-soon before pending", () => {
    const soon = billedCard("soon-card", "Soon card", 9, "100");
    const overdue = billedCard("overdue-card", "Overdue card", 1, "100");
    const summary = buildUpcomingItems({
      rows: rows({
        creditCards: [soon.card, overdue.card],
        cardTransactions: [...soon.cardTransactions, ...overdue.cardTransactions],
        debts: [{ id: "d1", name: "Debt", remaining_balance: "1000", monthly_payment: "500", active: true }]
      }),
      cycleStart,
      cycleEnd,
      today
    });

    expect(summary.items.map((item) => item.urgency)).toEqual(["overdue", "due-soon", "pending"]);
  });
});

import type { DashboardInput } from "./types";

export const sampleDashboardInput: DashboardInput = {
  accounts: [
    { id: "main-bank", name: "Main bank", type: "main_bank", balance: 79000, low_balance_threshold: null },
    { id: "other-bank", name: "Other bank", type: "other_bank", balance: 14500, low_balance_threshold: null },
    { id: "cash", name: "Cash", type: "cash", balance: 2500, low_balance_threshold: null },
    { id: "wallet", name: "Wallet", type: "wallet", balance: 1800, low_balance_threshold: null },
    { id: "investment", name: "Investment account", type: "investment", balance: 42000, low_balance_threshold: null },
    { id: "savings", name: "Savings account", type: "savings", balance: 50000, low_balance_threshold: null }
  ],
  obligations: [
    { id: "phone", label: "Phone bill", amount: 699, paid: false, kind: "bill" },
    { id: "internet", label: "Home internet", amount: 799, paid: true, kind: "bill" },
    { id: "ai-tools", label: "AI subscriptions", amount: 2200, paid: false, kind: "subscription" },
    { id: "family", label: "Family support", amount: 15000, paid: false, kind: "family_support" }
  ],
  reservedBudgets: [
    { id: "daily", label: "Daily living", budgetAmount: 24000, usedAmount: 9300 },
    { id: "shopping", label: "Misc shopping", budgetAmount: 7000, usedAmount: 4100 },
    { id: "luxury", label: "Luxury", budgetAmount: 5000, usedAmount: 1700 }
  ],
  creditCards: [
    { id: "card-1", cardName: "Card 1", billedOutstanding: 7400, currentCycleSpending: 8300 },
    { id: "card-2", cardName: "Card 2", billedOutstanding: 3900, currentCycleSpending: 2600 }
  ],
  plannedDebtPayments: [
    { id: "main-debt", debtName: "Main debt", amount: 9000, paid: false }
  ],
  sinkingFundReserves: [
    { id: "condo-fee", label: "Condo common fee", monthlyReserve: 2500, reservedThisCycle: false },
    { id: "football", label: "Football streaming annual app", monthlyReserve: 350, reservedThisCycle: false }
  ],
  cycleIncome: 95000,
  investmentTransfersThisCycle: 10000,
  debtRemaining: 392000
};

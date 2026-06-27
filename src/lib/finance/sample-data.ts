import type { DashboardInput } from "./types";

export const sampleDashboardInput: DashboardInput = {
  accounts: [
    { id: "main-bank", name: "Main bank", type: "main_bank", balance: 79000 },
    { id: "other-bank", name: "Other bank", type: "other_bank", balance: 14500 },
    { id: "cash", name: "Cash", type: "cash", balance: 2500 },
    { id: "wallet", name: "Wallet", type: "wallet", balance: 1800 },
    { id: "investment", name: "Investment account", type: "investment", balance: 42000 }
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
  creditCardStatements: [
    { id: "card-1-statement", cardName: "Card 1", currentCycleSpending: 8300, statementAmountDue: 12400, paidAmount: 5000 },
    { id: "card-2-statement", cardName: "Card 2", currentCycleSpending: 2600, statementAmountDue: 3900, paidAmount: 0 }
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

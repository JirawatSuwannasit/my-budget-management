export const dictionaries = {
  th: {
    realAvailable: "เงินใช้ได้จริง",
    cashLike: "เงินสดและบัญชีใช้จ่าย",
    investmentTracking: "เงินลงทุนแยกติดตาม",
    cycleIncome: "รายรับรอบนี้",
    unpaidObligations: "ภาระที่ยังไม่จ่าย",
    cardPayable: "ยอดบัตรที่ต้องจ่าย",
    sinkingFunds: "เงินกันรายปี",
    plannedDebt: "หนี้ที่วางแผนจ่าย",
    reservedBudgets: "งบที่กันไว้",
    dailyAvailable: "ใช้ได้ต่อวัน"
  },
  en: {
    realAvailable: "Real available money",
    cashLike: "Cash-like balance",
    investmentTracking: "Investment tracking",
    cycleIncome: "Cycle income",
    unpaidObligations: "Unpaid obligations",
    cardPayable: "Card payable",
    sinkingFunds: "Sinking funds",
    plannedDebt: "Planned debt",
    reservedBudgets: "Reserved budgets",
    dailyAvailable: "Daily available"
  }
} as const;

export type Locale = keyof typeof dictionaries;

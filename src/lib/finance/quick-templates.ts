import type { QuickTransactionTemplate } from "./types";

/** Pure validation shared by quick execution and unit tests; ownership is also enforced by RLS/query filters. */
export function resolveQuickAmount(template: Pick<QuickTransactionTemplate, "active" | "amount">, enteredAmount: string | number | null) {
  if (!template.active) throw new Error("QUICK_TEMPLATE_INACTIVE");
  const value = template.amount ?? enteredAmount;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("QUICK_AMOUNT_REQUIRED");
  return amount;
}

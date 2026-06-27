import type { TransactionType } from "./types";

export type BalanceEffectInput = {
  type: TransactionType;
  amount: number;
  accountId?: string | null;
  destinationAccountId?: string | null;
};

export type AccountBalanceDelta = {
  accountId: string;
  delta: number;
};

function addDelta(deltas: AccountBalanceDelta[], accountId: string | null | undefined, delta: number) {
  if (!accountId || delta === 0) return;
  const existing = deltas.find((item) => item.accountId === accountId);
  if (existing) {
    existing.delta += delta;
    return;
  }
  deltas.push({ accountId, delta });
}

export function getAccountBalanceDeltas(input: BalanceEffectInput): AccountBalanceDelta[] {
  const deltas: AccountBalanceDelta[] = [];

  switch (input.type) {
    case "income":
      addDelta(deltas, input.accountId, input.amount);
      break;
    case "expense":
    case "credit_card_payment":
    case "debt_payment":
      addDelta(deltas, input.accountId, -input.amount);
      break;
    case "transfer":
    case "investment_transfer":
      addDelta(deltas, input.accountId, -input.amount);
      addDelta(deltas, input.destinationAccountId, input.amount);
      break;
    case "credit_card_expense":
    case "sinking_fund_reserve":
      break;
  }

  return deltas.filter((delta) => delta.delta !== 0);
}

export function getReverseAccountBalanceDeltas(input: BalanceEffectInput): AccountBalanceDelta[] {
  return getAccountBalanceDeltas(input).map((delta) => ({ accountId: delta.accountId, delta: -delta.delta }));
}

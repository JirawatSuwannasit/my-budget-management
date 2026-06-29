/**
 * Shared constant for the destructive "Reset all my data" flow.
 *
 * The user must type this exact word to enable the reset button (client) and the
 * server action re-validates it before deleting anything. Locale-independent on
 * purpose so the confirmation is unambiguous.
 */
export const RESET_CONFIRM_WORD = "RESET";

/**
 * Finance tables wiped on reset, in FK-safe (child -> parent) order.
 * profiles and app_settings are intentionally excluded so language/currency/
 * cycle/bonus preferences survive (default_account_id nulls out when accounts go).
 */
export const RESET_TABLE_ORDER = [
  "card_payments",
  "card_transactions",
  "credit_card_statements",
  "credit_cards",
  "debt_payments",
  "debts",
  "transactions",
  "budgets",
  "subscriptions",
  "annual_expenses",
  "categories",
  "accounts"
] as const;

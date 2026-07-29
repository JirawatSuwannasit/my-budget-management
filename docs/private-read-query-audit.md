# Private-route read-query audit

This matrix records the material read-path changes. RLS still scopes every query;
the loaders also pass `user_id` explicitly. “Request shared” means React `cache()`
deduplicates the loader only within one Server Component render request.

| Route | Before | After | Bound / duplication |
|---|---|---|---|
| Private layout | Profile plus `loadUpcomingSummary` → all columns from 11 tables | Cached private context plus Upcoming-only columns; current-cycle transaction references and debt payments; no categories/budgets | Shared with `/upcoming`; card history remains unbounded because exact all-time card liability requires it |
| Dashboard | Profile/cycle plus all columns from 11 tables; independently rebuilt Upcoming | Dashboard-specific columns; transactions/budgets/debt payments restricted to current cycle; cached Upcoming shared with layout | Card transaction/payment history remains unbounded for exact billing parity |
| Upcoming | Profile plus the same all-column 11-table loader a second time | Same cached Upcoming result used by layout and page | One Upcoming load per request |
| Reports | All columns from 11 tables plus categories a second time | Report columns from transactions, debts, debt payments, and categories; one-row existence probes preserve prior empty/demo behavior | Transaction/debt-payment history remains unbounded because trajectory and latest non-contiguous stored cycles require it |
| Transactions | Eight scoped selects; recent transactions ordered by transaction date/creation and limited 25–500 | Unchanged | Already bounded and route-specific |
| Planning | Route-specific planning/account/category/card selects; current-cycle context | Unchanged | Already feature-specific |
| Accounts | Route-specific account/settings/profile selects | Unchanged | Small current-state tables |
| Debts/Cards | Narrow columns; payment/activity history limited to 80/120 | Unchanged | Already bounded for rendered history |
| Categories | Categories plus category-id-only linkage scans | Unchanged | Link counts genuinely use these rows; future aggregate RPC candidate |

## Column/filter detail for new shared Upcoming loader

- `accounts`: `id,name,type,balance,active,low_balance_threshold`; active only.
- `transactions`: only fields accepted by `DashboardRows`; exact current stored cycle.
- `subscriptions`, `annual_expenses`, `debts`, `credit_cards`: only Upcoming fields; active only.
- `debt_payments`: `id,debt_id,amount,paid_date`; current cycle date range.
- `card_transactions`: `id,card_id,amount,transaction_date`.
- `card_payments`: `id,card_id,amount`.
- Categories and budgets are not queried.

No finance calculation function was changed. The remaining unbounded card rails
are documented rather than replaced with duplicated SQL finance formulas without
an integration environment capable of proving exact aggregate parity.

# Supabase Schema Audit

**Audit date:** 2026-08-17  
**Overall status:** **ACTION REQUIRED — live verification is incomplete**

## Executive Summary

The repository defines a coherent final schema across migrations `001`–`018`, but this environment has **no safe connection to the live Supabase project**. There is no Supabase CLI binary, linked-project metadata, database connection variable, or local environment file containing a project connection. An attempted CLI version lookup through `npx` was blocked before installation. Consequently, this audit does **not** claim that production matches the repository.

One historical drift incident is established by operator evidence: `public.set_updated_at()` was absent when migration 018 first ran, although every Git revision inspected for `001_initial_schema.sql` contains that function before its triggers. The operator reports that the function was restored manually and that the Quick Add table, trigger, and four policies now exist. This is evidence of an initialization/history mismatch, not proof that the rest of migration 001 or later migrations match.

### Finding counts

These counts distinguish discrepancies/evidenced audit risks from live objects that remain merely unverified:

- **CRITICAL: 0 confirmed**
- **HIGH: 1** — foundational trigger function was historically missing (reported restored)
- **MEDIUM: 2** — remote migration history cannot be compared; migration 018 columns/constraints/indexes have not been independently inventoried
- **LOW: 0**
- **Current live drift count:** unknown until the read-only inventory is returned

| Severity | Object | Expected | Actual | Recommended action |
| --- | --- | --- | --- | --- |
| HIGH (historical; reportedly resolved) | `public.set_updated_at()` | Trigger function installed by migration 001 | Missing when 018 was first attempted; operator reports manual restoration | Verify signature, body hash, owner, privileges, and every dependent trigger before recording resolution |
| MEDIUM | `supabase_migrations.schema_migrations` | Ordered records corresponding to local `001`–`018` | Not accessible from this environment; manual execution makes 018 history especially uncertain | Run the read-only history query and compare versions; do not repair history yet |
| MEDIUM | Migration 018 full shape | 15 columns, constraints, 3 secondary indexes, trigger, RLS, 4 policies | Table/function/trigger/policies are operator-confirmed; exact columns, constraints, indexes, and policy expressions are not independently verified | Run the supplied catalog inventory and compare every object before declaring 018 complete |

## Database Access

### What was checked

- `supabase --version`: binary is not installed.
- `npx supabase --version`: package retrieval was denied; no CLI was installed.
- Environment variable **names only**: no Supabase/Postgres/database connection variables were present.
- `.env`, `.env.local`, `.env.development`, `.env.production`: none were present.
- `supabase/config.toml`, `.supabase`, and linked-project metadata: absent.

No secret values were printed. No remote SQL, migration, repair, push, reset, or write operation was performed.

### Required live evidence

Run [`docs/supabase-schema-audit.sql`](./supabase-schema-audit.sql) in the live project's SQL Editor and export **all result grids**. If the final migration-history query is permission-restricted, separately provide read-only output from `supabase migration list` from an already authenticated and linked workstation. Redact project identifiers and credentials, but retain version numbers and object definitions.

## Migration Status

### Local migration inventory

The repository contains 18 sequential, uniquely numbered files with no numbering gap:

1. `001_initial_schema.sql`
2. `002_link_side_records_to_transactions.sql`
3. `003_add_transactions_destination_account_id.sql`
4. `004_add_planning_category_links.sql`
5. `005_add_debt_bonus_payment_amount.sql`
6. `006_expand_category_kinds.sql`
7. `007_add_annual_expense_reserve_account.sql`
8. `008_add_debt_card_link_and_term.sql`
9. `009_add_savings_account_type.sql`
10. `010_drop_credit_card_statements.sql`
11. `011_add_subscription_payment_source.sql`
12. `012_add_subscription_next_source.sql`
13. `013_add_account_low_balance_threshold.sql`
14. `014_add_debt_category.sql`
15. `015_add_atomic_finance_transaction_rpcs.sql`
16. `016_add_idempotent_automated_charge_rpcs.sql`
17. `017_guard_credit_card_deactivation.sql`
18. `018_add_quick_transaction_templates.sql`

Remote history was **not available**, so locally missing remote versions, remotely missing local versions, partial applications, and manual-only objects cannot yet be classified. Because 018 was executed manually after an initial failure, its schema state and its migration-history state must be treated as separate questions.

## Expected Final Schema

After applying 001–018 in order, `public` should contain 15 application tables. `credit_card_statements`, initially created by 001, should no longer exist after 010.

### Tables

| Table | Expected final structure and integrity rules | Live comparison |
| --- | --- | --- |
| `profiles` | UUID `user_id` PK/FK → `auth.users` cascade; display/locale/currency/cycle/signup fields; locale and cycle checks; timestamps | Required |
| `accounts` | UUID PK; owner FK cascade; enum type; numeric balance; generated `is_cash_like`; active; nullable nonnegative `low_balance_threshold`; timestamps | Required |
| `categories` | UUID PK; owner FK cascade; name/kind/color/icon/active; expanded kind check; unique `(user_id,name,kind)`; timestamps | Required |
| `transactions` | UUID PK; owner FK cascade; source/destination/category FKs set null; transaction enum; nonnegative amount; transaction/cycle dates; related entity/notes; transfer destination check; timestamps | Required |
| `budgets` | Owner/category references; label/amount/cycle/active; nonnegative amount; unique `(user_id,label,cycle_start_date)`; timestamps | Required |
| `subscriptions` | Owner/category FKs; frequency enum; price/billing/payment fields; active; current and next account/card source FKs with set-null behavior and source exclusivity checks; effective date; timestamps | Required |
| `annual_expenses` | Owner/category references; amount/due date/generated monthly reserve; active; nullable reserve-account FK with set-null behavior; timestamps | Required |
| `debts` | Owner FK; debt enum; amounts/rate/payment/bonus checks; optional card FK and category FK set null; installment term check; active; timestamps | Required |
| `debt_payments` | Owner/debt/account references; debt cascade, account set null; nonnegative amount/date/source; nullable transaction link set null; timestamps | Required |
| `credit_cards` | Owner FK; name/cut/due-day checks; active; timestamps; guarded deactivation trigger | Required |
| `card_transactions` | Owner/card/category references; card cascade/category set null; nonnegative amount/date/billing cycle; nullable transaction link set null; timestamps; no `statement_id` | Required |
| `card_payments` | Owner/card/account references; card cascade/account set null; nonnegative amount/date; nullable transaction link set null; timestamps; no `statement_id` | Required |
| `app_settings` | Owner UUID PK/FK cascade; bonus-month array; nullable default-account FK set null; timestamps | Required |
| `automated_charge_claims` | Composite PK `(user_id, charge_kind, entity_id, cycle_start_date)`; owner and transaction FKs cascade; kind/entity/cycle/created fields; kind check; SELECT-only user policy and restricted table grants | Required |
| `quick_transaction_templates` | Exact 018 shape detailed below | Partially operator-confirmed; catalog verification required |
| `credit_card_statements` | **Absent** after migration 010 | Required |

The live inventory must compare column order only for diagnostics; semantic checks must cover types, enum UDTs, precision/scale, defaults, nullability, generated expressions, PK/unique/check constraints, FK target, and `ON DELETE` action.

## Functions / RPCs

Expected `public` functions and security-sensitive properties:

| Function | Expected identity/signature | Expected security posture | Risk if different |
| --- | --- | --- | --- |
| `set_updated_at` | `()` → trigger | Invoker (default); PL/pgSQL | HIGH for operational failures; potentially broader if triggers are wrong |
| `handle_new_private_user` | `()` → trigger | `SECURITY DEFINER`, fixed `search_path = public` | CRITICAL/HIGH depending on divergence |
| `apply_finance_transaction_effects` | `(uuid,uuid,transaction_type,numeric,uuid,uuid,uuid,date,date,text,uuid,uuid)` | `SECURITY INVOKER`, `search_path = pg_catalog`; no direct authenticated execute | HIGH |
| `reverse_finance_transaction_effects` | `(uuid,uuid)` | `SECURITY INVOKER`, `search_path = pg_catalog`; no direct authenticated execute | HIGH |
| `create_finance_transaction` | `(transaction_type,numeric,uuid,uuid,uuid,date,date,uuid,text,uuid,uuid)` → JSONB | `SECURITY DEFINER`; authenticated execute only | HIGH/CRITICAL |
| `update_finance_transaction` | `(uuid,transaction_type,numeric,uuid,uuid,uuid,date,date,uuid,text,uuid,uuid)` → JSONB | `SECURITY DEFINER`; authenticated execute only | HIGH/CRITICAL |
| `delete_finance_transaction` | `(uuid)` → JSONB | `SECURITY DEFINER`; authenticated execute only | HIGH/CRITICAL |
| `materialize_due_subscription_charge` | `(uuid,date,date)` → JSONB | `SECURITY DEFINER`; authenticated execute only | HIGH |
| `materialize_due_installment_charge` | `(uuid,date,date)` → JSONB | `SECURITY DEFINER`; authenticated execute only | HIGH |
| `guard_credit_card_deactivation` | `()` → trigger | `SECURITY DEFINER`; no public/anon/authenticated execute | HIGH |

The supplied SQL reports identity arguments, result type, language, `SECURITY DEFINER`, per-function configuration (including `search_path`), owner, anon/authenticated execute access, overloads, and a definition hash. Definition hashes can establish that live routines differ, but comparison of the function body against migrations is still needed to determine materiality. Any mismatch in the three finance transaction RPCs or their apply/reverse helpers is **HIGH at minimum**; ownership bypass or broad execute exposure can be **CRITICAL**.

## Triggers

Expected final triggers are:

- `BEFORE UPDATE ... EXECUTE FUNCTION public.set_updated_at()` on `profiles`, `accounts`, `categories`, `transactions`, `budgets`, `subscriptions`, `annual_expenses`, `debts`, `debt_payments`, `credit_cards`, `card_transactions`, `card_payments`, `app_settings`, and `quick_transaction_templates`.
- `credit_cards_guard_deactivation`: `BEFORE UPDATE OF active` on `credit_cards`, calling `guard_credit_card_deactivation()`.
- `on_auth_user_created`: after insert on `auth.users`, calling `handle_new_private_user()` (this will not appear when filtering only `public` event tables, so inspect it separately if SQL Editor permissions permit).
- No remaining trigger for the dropped `credit_card_statements` table.

Live timing, event, orientation, condition, called routine, duplicates, and enabled state remain to be verified. The historical absence of `set_updated_at()` raises the specific possibility that some older update triggers were also never installed, because migration 001 creates the function immediately before those triggers.

## RLS Policies

RLS should be enabled on every public application table. The expected ownership model is:

- `profiles` and `app_settings`: four policies each (SELECT/INSERT/UPDATE/DELETE), scoped by `auth.uid() = user_id`; UPDATE also has matching `WITH CHECK`.
- The user-owned tables created by 001 (`accounts`, `categories`, `transactions`, `budgets`, `subscriptions`, `annual_expenses`, `debts`, `debt_payments`, `credit_cards`, `card_transactions`, `card_payments`): the same four ownership policies generated by the migration's loop.
- `quick_transaction_templates`: the same four ownership policies, explicitly named in 018.
- `automated_charge_claims`: RLS enabled with only an own-row SELECT policy. Direct INSERT/UPDATE/DELETE are prevented by revoked table grants; controlled writes occur inside the security-definer materialization RPCs.
- `credit_card_statements`: absent, therefore no surviving policies.

The operator-confirmed four Quick Add policy **names** are encouraging but insufficient to prove their `USING`, `WITH CHECK`, command, role, or permissive/restrictive mode. Until `pg_policies` and `relrowsecurity` output is reviewed, the overall RLS posture is **unverified**, not unsafe. Any disabled RLS, `USING (true)`, missing ownership predicate, overly broad role, or absent UPDATE `WITH CHECK` is CRITICAL.

## Indexes

The expected final schema includes PK/unique indexes plus the explicitly named indexes from all migrations. Priority groups are:

- Transactions: user/cycle, user/date, source account, destination account, category.
- Accounts/categories: owner; category owner/kind and owner/active; app-settings default account.
- Planning: budget user/cycle and category; subscription owner/active, category, owner/category, current and next source account/card; annual-expense owner/active, category, owner/category, reserve account.
- Debts/cards: debt owner/active, owner/type, card, category; debt-payment owner/debt, account, transaction; credit-card owner/active.
- Card side records: card-transaction owner/card, owner/cycle, category, transaction; card-payment owner/card, account, transaction. Statement indexes must be absent after 010.
- Automated claims: primary key `(user_id,charge_kind,entity_id,cycle_start_date)` and transaction ID.
- Quick Add: `quick_transaction_templates_user_id_idx`, `quick_transaction_templates_user_active_idx`, and `quick_transaction_templates_user_sort_idx`.

Missing secondary indexes are normally LOW unless they make a locking or idempotency path unsafe under load. Missing unique indexes backing claim idempotency are HIGH because duplicate financial materialization could become possible.

## Enums and Extensions

Expected extension: `pgcrypto` (plus platform-provided PL/pgSQL).

Expected enum order:

- `account_type`: `main_bank`, `other_bank`, `cash`, `wallet`, `investment`, `savings` (009 appends `savings`).
- `transaction_type`: `income`, `expense`, `transfer`, `credit_card_expense`, `credit_card_payment`, `debt_payment`, `investment_transfer`, `sinking_fund_reserve`.
- `subscription_frequency`: `monthly`, `yearly`.
- `card_statement_status`: `unpaid`, `partial`, `paid`. This type remains expected even though its table was dropped; migration 010 does not drop the enum.
- `debt_type`: `interest_free`, `interest_bearing`, `installment`, `personal_loan`, `credit_card_debt`, `other`.

Missing or reordered values can break casts and RPC calls and should generally be HIGH. Harmless unused extra values require application review before classification.

## Migration 018

Expected table columns, in migration order:

`id`, `user_id`, `name`, `type`, `amount`, `account_id`, `destination_account_id`, `category_id`, `related_entity_id`, `notes`, `icon_key`, `sort_order`, `active`, `created_at`, `updated_at`.

Expected constraints and behavior:

- UUID PK with `gen_random_uuid()` default.
- Owner FK to `auth.users(id) ON DELETE CASCADE`.
- Nonblank trimmed name check.
- `transaction_type` limited by a check to expense, income, or credit-card expense.
- Nullable `numeric(14,2)` amount, positive when present.
- Optional account/destination/category FKs with `ON DELETE SET NULL`.
- `sort_order = 0`, `active = true`, and timestamps defaulting to `now()`.
- Three named secondary indexes listed in the Indexes section.
- `BEFORE UPDATE` updated-at trigger calling `public.set_updated_at()`.
- RLS enabled and four own-row policies with the exact names documented in migration 018.

**Current conclusion:** 018 is **not independently proven complete**. Based on the operator's confirmation, its table, trigger, and policy names exist; the function exists after manual restoration. The three indexes, all 15 columns, constraints/defaults/FKs, RLS flag, and exact policy expressions still require catalog output.

## Root Cause Investigation

Git history for `001_initial_schema.sql` shows four revisions (`c0c553f`, `fa40ac5`, `59e6f5f`, `6c258c4`). The historical migration **was modified after its first commit**: category kinds were expanded, `annual_expenses.reserved_this_cycle` was removed, `debts.bonus_payment_amount` was added, and `categories_user_active_idx` was added. Some of those changes are also represented defensively in later migrations 005/006. This makes the exact commit used to initialize production relevant and is itself a migration-discipline warning. However, in every retrievable revision, `set_updated_at()` appears before the updated-at triggers. There is no repository evidence that a committed version omitted this function. Therefore, “the current migration was later amended to add the function” is not supported by the available Git evidence.

Plausible explanations, pending remote history/catalog evidence, are:

1. Production was initialized using another schema script, dashboard setup, or an uncommitted/older local file rather than the committed migration.
2. Migration 001 was only partially executed and execution resumed manually after an error, leaving the function and possibly subsequent triggers/policies/indexes absent.
3. The function was removed manually or by an external deployment after initialization.
4. Migration records claim 001 was applied even though the corresponding SQL was not applied atomically or was materially different.
5. Less likely but still possible: the function existed in a different schema due to search-path/context differences; the reported error specifically rules out `public.set_updated_at()` at the time of 018.

Remote migration versions, function ownership/body, trigger inventory, and creation provenance are required to distinguish these hypotheses.

## Reconciliation Plan

1. **Freeze schema writes** for the audit window; do not run repair, reset, push, or historical migrations.
2. Run the supplied read-only SQL against the same live project used by the application and export every result set.
3. Obtain read-only migration history (`schema_migrations` query or `supabase migration list`) and compare exact versions with local 001–018.
4. Compare RLS flags and policies first. Escalate any ownership exposure as CRITICAL and stop feature deployment until resolved.
5. Compare finance RPC signatures, bodies, `SECURITY DEFINER`, `search_path`, grants, helper routines, and claim uniqueness. Escalate differences as HIGH and pause finance writes if integrity is uncertain.
6. Compare tables, constraints, FKs, enum order, and triggers; then compare secondary indexes.
7. Verify migration 018 separately, including all columns, checks, FKs, indexes, trigger definition, RLS flag, and policy expressions.
8. Document each confirmed difference and its data impact. Back up the database before any corrective work.
9. Only after review, create a **new** `019_reconcile_schema_drift.sql`. Prefer additive, narrowly idempotent repairs; never edit 001–018 or mark history repaired merely because objects happen to exist.
10. Test 019 on an isolated clone/staging project restored from production metadata/data, then deploy through the normal migration mechanism with a rollback/containment plan.

## Idempotency Guidance

Use `IF NOT EXISTS` for non-semantic, safely equivalent objects such as a secondary performance index **only after** verifying that an existing same-named object has the expected definition. It can also be appropriate for extensions managed across fresh environments.

Keep strict failures for tables, columns with constraints/defaults, enums, RLS policies, security-definer functions, financial RPC signatures, unique/idempotency constraints, and triggers. Blind existence guards can conceal a wrong definition—the exact failure mode this audit is intended to detect. For functions whose bodies are intentionally authoritative, `CREATE OR REPLACE` in a new migration is reasonable only after signature, grants, ownership, `SECURITY DEFINER`, and `search_path` are explicitly restated and reviewed.

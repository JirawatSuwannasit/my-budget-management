# Atomic manual finance transactions (Phase A)

## Preserved side-effect matrix

| Type | Account effect on create | Linked row | Other effect | Reversal |
|---|---|---|---|---|
| `income` | source `+ amount` | none | none | source `- amount` |
| `expense` | source `- amount` | none | none | source `+ amount` |
| `transfer` | source `- amount`, destination `+ amount` | none | none | both deltas negated |
| `investment_transfer` | source `- amount`, investment destination `+ amount` | none | none | both deltas negated |
| `credit_card_expense` | none | `card_transactions` | contributes to the existing card billing model | linked row removed; a linked installment paydown, if present on a historical/automatic row, is restored |
| `credit_card_payment` | source `- amount` | `card_payments` | existing billed-outstanding calculation observes the payment | source restored from the linked payment and row removed |
| `debt_payment` | source `- amount` | `debt_payments` | remaining debt becomes `greatest(0, remaining - amount)` | source and the full payment amount are restored and row removed |
| `sinking_fund_reserve` with destination | source `- amount`, destination `+ amount` | none | none | both deltas negated |
| `sinking_fund_reserve` without accounts | none | none | remains a balance-neutral marker | none |

Edits reverse the complete old row and then apply the complete new row. The
database aborts the statement (and therefore both halves) if any validation,
balance, child-row, or ownership check fails.

## Scope boundary

Manual creates, edits, and deletes use the three RPCs introduced by migration
`015_add_atomic_finance_transaction_rpcs.sql`. Migration 016 subsequently moves
only the write portion of subscription and installment lazy materialization into
focused atomic/idempotent RPCs; their TypeScript timing and selection logic stay
unchanged. Dashboard, card-cut, safe-to-spend, subscription, installment, and
financial-cycle calculations were not changed.

The RPCs are `SECURITY DEFINER` because their non-public helper functions have
no execute grant for application roles and must still be callable as one unit.
Each public entry point derives the owner from `auth.uid()`, validates every
reference against that owner, uses an empty/safe search path, and is executable
only by `authenticated`. The functions never accept a user ID.

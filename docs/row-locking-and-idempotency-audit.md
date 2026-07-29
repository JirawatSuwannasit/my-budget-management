# Row-locking and automated-charge idempotency audit

## Confirmed manual locking

Migration 015 already makes each manual RPC one PostgreSQL statement/transaction.

| Operation | Rows locked before effects | Order |
|---|---|---|
| Create expense/income/card payment | selected account (when applicable) | UUID order in the entry RPC; helper re-lock is harmless |
| Create transfer/investment/sinking-fund transfer | source and destination accounts | account UUID ascending |
| Create debt payment | selected account, then referenced debt | account UUID ascending, then debt |
| Edit | existing transaction; union of old/new accounts; union of old/new debts | transaction, account UUID ascending, debt UUID ascending |
| Delete/reversal | existing transaction; old accounts; linked debts where applicable | transaction, account UUID ascending, debt UUID ascending |

All balance mutations use locked rows and SQL arithmetic (`balance = balance +
delta`), so concurrent writes cannot overwrite a balance read earlier by the
application. A failed debit raises inside the same statement, rolling back a
destination credit, child insert, reversal, and transaction-row mutation.

## Gap found and fixed

The automated paths still used an application read-before-write check. Two app
opens could both select a charge as due. Installments were more exposed because
the transaction, child debt-payment insert, and remaining-balance update were
three separate application operations.

Migration 016 adds `automated_charge_claims`, whose composite primary key is the
database guarantee for `(user, charge kind, entity, financial cycle)`. A claim,
finance transaction, account/card effect, and installment debt effect now commit
inside one focused RPC. A competing request waits on the unique key and returns
`already_processed`. Deleting the linked transaction cascades its claim, which
preserves the existing behavior that a deliberately deleted automatic charge is
eligible for lazy materialization again.

No uniqueness rule was added to manual transactions: two intentionally identical
manual purchases remain valid. Explicit request-ID idempotency for manual form
retries remains possible future work, but is outside this narrowly scoped phase.

## Existing-data safety and diagnostic

The migration never deletes, updates, or backfills historical finance rows. Its
RPCs check existing transaction linkage before claiming a key, so pre-migration
charges remain recognized. Because old application-level concurrency could have
created duplicates, inspect them read-only in Supabase SQL Editor before Preview
testing:

```sql
select user_id, related_entity_id, cycle_start_date, type, count(*) as row_count
from public.transactions
where related_entity_id is not null
  and type in ('expense', 'credit_card_expense')
group by user_id, related_entity_id, cycle_start_date, type
having count(*) > 1
order by row_count desc, cycle_start_date desc;
```

Rows returned are diagnostic only: the migration does not silently decide which
historical financial record is correct or modify any balance.

-- Phase: Accounts + Transactions CRUD
-- This migration links side-effect records back to the transaction that created them.
-- It enables safe edit/delete behavior for credit card expenses, credit card payments, and debt payments.

alter table public.card_transactions
  add column if not exists transaction_id uuid references public.transactions(id) on delete set null;

alter table public.card_payments
  add column if not exists transaction_id uuid references public.transactions(id) on delete set null;

alter table public.debt_payments
  add column if not exists transaction_id uuid references public.transactions(id) on delete set null;

create index if not exists card_transactions_transaction_id_idx on public.card_transactions(transaction_id);
create index if not exists card_payments_transaction_id_idx on public.card_payments(transaction_id);
create index if not exists debt_payments_transaction_id_idx on public.debt_payments(transaction_id);

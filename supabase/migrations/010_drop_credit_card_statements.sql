-- Phase: Card-centric credit card model
-- Removes the manual statement rail. Card obligations are now derived at read
-- time from card_transactions minus card_payments, split into billed vs.
-- current-cycle spend using each card's billing_cut_day. Safe/idempotent to
-- re-run: guarded with IF EXISTS on both the table and the columns.

drop table if exists public.credit_card_statements cascade;

alter table public.card_payments
  drop column if exists statement_id;

alter table public.card_transactions
  drop column if exists statement_id;

notify pgrst, 'reload schema';

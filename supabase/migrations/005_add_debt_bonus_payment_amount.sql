-- Phase 7 debt planning support
-- Adds an optional bonus-payment amount for debt payoff estimates.
-- Existing debt rows are preserved and default to 0.

alter table public.debts
  add column if not exists bonus_payment_amount numeric(14,2) not null default 0 check (bonus_payment_amount >= 0);

create index if not exists debts_user_type_idx
  on public.debts(user_id, type);

notify pgrst, 'reload schema';

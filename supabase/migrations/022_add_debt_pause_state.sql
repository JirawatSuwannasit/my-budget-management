-- Add an explicit pause state for debts.
-- "active" continues to mean the debt record is in use; "paused" only suspends
-- the recurring monthly obligation/reminder. Paused cycles are not accrued.
alter table public.debts
  add column if not exists paused boolean not null default false;

alter table public.debts
  add column if not exists paused_at timestamptz;

create index if not exists debts_user_paused_idx
  on public.debts(user_id, paused);

notify pgrst, 'reload schema';

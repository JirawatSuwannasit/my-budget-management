-- Phase: Per-account low-balance alerts
-- Adds an optional per-account threshold; when an active account's balance
-- falls below it, a reminder surfaces in the Upcoming panel only (no display
-- on the Accounts page itself). Safe to run on existing databases; existing
-- rows keep the column null, which means the alert is disabled (no behavior
-- change).

alter table public.accounts
  add column if not exists low_balance_threshold numeric(14,2);

notify pgrst, 'reload schema';

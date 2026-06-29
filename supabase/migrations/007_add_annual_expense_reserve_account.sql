-- Phase: Sinking fund fixed reserve account
-- Binds each annual expense / sinking fund to one account, used as the fixed
-- source for both "Reserve this month" and "Pay annual bill".
-- Safe to run on existing databases; existing rows keep reserve_account_id as
-- null and the UI falls back to the account picker for those legacy rows.

alter table public.annual_expenses
  add column if not exists reserve_account_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_expenses_reserve_account_id_fkey'
      and conrelid = 'public.annual_expenses'::regclass
  ) then
    alter table public.annual_expenses
      add constraint annual_expenses_reserve_account_id_fkey
      foreign key (reserve_account_id)
      references public.accounts(id)
      on delete set null;
  end if;
end $$;

create index if not exists annual_expenses_reserve_account_id_idx
  on public.annual_expenses(reserve_account_id);

notify pgrst, 'reload schema';

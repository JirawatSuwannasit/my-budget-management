-- Phase: Accounts + Transactions CRUD schema repair
-- Adds the destination account link needed by transfer and investment_transfer transactions.

alter table public.transactions
  add column if not exists destination_account_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_destination_account_id_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_destination_account_id_fkey
      foreign key (destination_account_id)
      references public.accounts(id)
      on delete set null;
  end if;
end $$;

create index if not exists transactions_destination_account_id_idx
  on public.transactions(destination_account_id);

notify pgrst, 'reload schema';

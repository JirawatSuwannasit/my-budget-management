-- Phase: Fixed category for card installments
-- Lets a card installment (type=installment) be tagged with one expense
-- category at creation. The per-cycle auto-charge engine stamps every
-- generated credit_card_expense with this same category_id, so all cycles
-- from the first charge to the final remainder share it automatically.
-- Optional (nullable) for backward compatibility with existing installments
-- and other debt types. Safe to run on existing databases.

alter table public.debts
  add column if not exists category_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'debts_category_id_fkey'
      and conrelid = 'public.debts'::regclass
  ) then
    alter table public.debts
      add constraint debts_category_id_fkey
      foreign key (category_id)
      references public.categories(id)
      on delete set null;
  end if;
end $$;

create index if not exists debts_category_id_idx
  on public.debts(category_id);

notify pgrst, 'reload schema';

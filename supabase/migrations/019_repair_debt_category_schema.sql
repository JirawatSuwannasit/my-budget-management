-- Repair production schema drift for card-linked installments.
-- The application and materialize_due_installment_charge RPC already expect
-- debts.category_id, but some existing databases were deployed without
-- migration 014. Keep this migration idempotent so it is safe on both states.

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

-- Phase 6 schema repair
-- Adds category links used by subscription and annual expense planning screens.
-- Safe to run on existing databases; existing rows keep category_id as null.

alter table public.subscriptions
  add column if not exists category_id uuid;

alter table public.annual_expenses
  add column if not exists category_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_category_id_fkey'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_category_id_fkey
      foreign key (category_id)
      references public.categories(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_expenses_category_id_fkey'
      and conrelid = 'public.annual_expenses'::regclass
  ) then
    alter table public.annual_expenses
      add constraint annual_expenses_category_id_fkey
      foreign key (category_id)
      references public.categories(id)
      on delete set null;
  end if;
end $$;

create index if not exists subscriptions_category_id_idx
  on public.subscriptions(category_id);

create index if not exists subscriptions_user_category_idx
  on public.subscriptions(user_id, category_id);

create index if not exists annual_expenses_category_id_idx
  on public.annual_expenses(category_id);

create index if not exists annual_expenses_user_category_idx
  on public.annual_expenses(user_id, category_id);

notify pgrst, 'reload schema';

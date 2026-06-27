-- Phase 8 category management support
-- Expands category kinds without touching existing category rows.

do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'public.categories'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%kind%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.categories drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.categories
  add constraint categories_kind_check
  check (kind in ('income', 'expense', 'transfer', 'debt', 'subscription', 'sinking_fund', 'investment', 'other'));

create index if not exists categories_user_active_idx
  on public.categories(user_id, active);

notify pgrst, 'reload schema';

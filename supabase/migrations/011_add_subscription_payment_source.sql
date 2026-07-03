-- Phase: Subscription structured payment source
-- Binds each subscription to one cash-like account OR one credit card, used
-- as the structured payment source (replacing the free-text payment_method
-- input in the form). payment_method is kept for legacy display.
-- Safe to run on existing databases; existing rows keep both new columns
-- null and the UI falls back to the free-form legacy behavior for those rows.

alter table public.subscriptions
  add column if not exists source_account_id uuid;

alter table public.subscriptions
  add column if not exists source_card_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_source_account_id_fkey'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_source_account_id_fkey
      foreign key (source_account_id)
      references public.accounts(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_source_card_id_fkey'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_source_card_id_fkey
      foreign key (source_card_id)
      references public.credit_cards(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_single_source_chk'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_single_source_chk
      check (source_account_id is null or source_card_id is null);
  end if;
end $$;

create index if not exists subscriptions_source_account_id_idx
  on public.subscriptions(source_account_id);

create index if not exists subscriptions_source_card_id_idx
  on public.subscriptions(source_card_id);

notify pgrst, 'reload schema';

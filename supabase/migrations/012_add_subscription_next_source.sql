-- Phase: Scheduled subscription payment-source change
-- Lets a user change a subscription's bound payment source effective at the
-- start of the NEXT billing cycle, without touching source_account_id /
-- source_card_id (which stay authoritative for the current cycle's charge).
-- Promotion happens lazily on app open (processDueSubscriptionCharges), not
-- via a scheduler. Safe to run on existing databases; existing rows keep the
-- new columns null, meaning no scheduled change is pending.

alter table public.subscriptions
  add column if not exists next_source_account_id uuid;

alter table public.subscriptions
  add column if not exists next_source_card_id uuid;

alter table public.subscriptions
  add column if not exists next_source_effective_from date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_next_source_account_id_fkey'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_next_source_account_id_fkey
      foreign key (next_source_account_id)
      references public.accounts(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_next_source_card_id_fkey'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_next_source_card_id_fkey
      foreign key (next_source_card_id)
      references public.credit_cards(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_single_next_source_chk'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_single_next_source_chk
      check (next_source_account_id is null or next_source_card_id is null);
  end if;
end $$;

create index if not exists subscriptions_next_source_account_id_idx
  on public.subscriptions(next_source_account_id);

create index if not exists subscriptions_next_source_card_id_idx
  on public.subscriptions(next_source_card_id);

notify pgrst, 'reload schema';

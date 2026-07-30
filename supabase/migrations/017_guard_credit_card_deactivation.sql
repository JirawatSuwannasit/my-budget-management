-- Guard only active -> inactive credit-card transitions. Normal edits,
-- reactivation, deletion, and automatic charge behavior are unchanged.

create or replace function public.guard_credit_card_deactivation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_this_cut date;
  v_last_cut date;
  v_billed_spend numeric;
  v_current_spend numeric;
  v_total_paid numeric;
begin
  if not (old.active is true and new.active is false) then
    return new;
  end if;

  if v_user_id is null or v_user_id <> old.user_id then
    raise exception using errcode = 'P0001', message = 'CARD_DEACTIVATE_INVALID_REFERENCE';
  end if;

  -- Match computeCardObligation exactly: clamp the cut day to the month's
  -- final day and use the most recent cut on or before today.
  v_this_cut := make_date(
    extract(year from current_date)::integer,
    extract(month from current_date)::integer,
    least(
      old.billing_cut_day,
      extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::integer
    )
  );
  if current_date >= v_this_cut then
    v_last_cut := v_this_cut;
  else
    v_last_cut := make_date(
      extract(year from (current_date - interval '1 month'))::integer,
      extract(month from (current_date - interval '1 month'))::integer,
      least(
        old.billing_cut_day,
        extract(day from (date_trunc('month', current_date - interval '1 month') + interval '1 month - 1 day'))::integer
      )
    );
  end if;

  select
    coalesce(sum(ct.amount) filter (where ct.transaction_date <= v_last_cut), 0),
    coalesce(sum(ct.amount) filter (where ct.transaction_date > v_last_cut), 0)
  into v_billed_spend, v_current_spend
  from public.card_transactions ct
  where ct.user_id = old.user_id and ct.card_id = old.id;

  select coalesce(sum(cp.amount), 0) into v_total_paid
  from public.card_payments cp
  where cp.user_id = old.user_id and cp.card_id = old.id;

  if greatest(0, v_billed_spend - v_total_paid) > 0 then
    raise exception using errcode = 'P0001', message = 'CARD_DEACTIVATE_BILLED_OUTSTANDING';
  end if;
  if v_current_spend > 0 then
    raise exception using errcode = 'P0001', message = 'CARD_DEACTIVATE_CURRENT_SPENDING';
  end if;
  if exists (
    select 1 from public.subscriptions s
    where s.user_id = old.user_id and s.source_card_id = old.id
      and s.active is true and s.frequency = 'monthly'
  ) then
    raise exception using errcode = 'P0001', message = 'CARD_DEACTIVATE_ACTIVE_SUBSCRIPTION';
  end if;
  if exists (
    select 1 from public.debts d
    where d.user_id = old.user_id and d.card_id = old.id
      and d.active is true and d.type = 'installment'
  ) then
    raise exception using errcode = 'P0001', message = 'CARD_DEACTIVATE_ACTIVE_INSTALLMENT';
  end if;
  if exists (
    select 1 from public.subscriptions s
    where s.user_id = old.user_id and s.next_source_card_id = old.id
  ) then
    raise exception using errcode = 'P0001', message = 'CARD_DEACTIVATE_NEXT_SUBSCRIPTION_SOURCE';
  end if;

  return new;
end;
$$;

drop trigger if exists credit_cards_guard_deactivation on public.credit_cards;
create trigger credit_cards_guard_deactivation
  before update of active on public.credit_cards
  for each row
  execute function public.guard_credit_card_deactivation();

revoke all on function public.guard_credit_card_deactivation() from public, anon, authenticated;

notify pgrst, 'reload schema';

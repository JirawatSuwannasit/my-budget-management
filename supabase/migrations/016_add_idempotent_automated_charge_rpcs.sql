-- Phase B: atomic, database-idempotent subscription/installment materialization.
-- Existing finance rows are neither changed nor backfilled. Each RPC also
-- checks the existing transactions table before claiming a key, so a charge
-- materialized before this migration remains treated as already processed.

create table public.automated_charge_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  charge_kind text not null check (charge_kind in ('monthly_subscription', 'card_installment')),
  entity_id uuid not null,
  cycle_start_date date not null,
  transaction_id uuid references public.transactions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, charge_kind, entity_id, cycle_start_date)
);

alter table public.automated_charge_claims enable row level security;

create policy "Users can read own automated charge claims"
  on public.automated_charge_claims for select
  using (auth.uid() = user_id);

-- Writes are intentionally available only through the SECURITY DEFINER RPCs.
revoke all on table public.automated_charge_claims from public, anon, authenticated;
grant select on table public.automated_charge_claims to authenticated;

create index automated_charge_claims_transaction_id_idx
  on public.automated_charge_claims(transaction_id);

create or replace function public.materialize_due_subscription_charge(
  p_subscription_id uuid,
  p_cycle_start_date date,
  p_transaction_date date
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_subscription public.subscriptions%rowtype;
  v_transaction_id uuid;
  v_type public.transaction_type;
  v_claimed integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'FINANCE_LOGIN_REQUIRED';
  end if;

  select * into v_subscription
    from public.subscriptions
    where id = p_subscription_id and user_id = v_user_id
    for update;
  if not found or v_subscription.active is false or v_subscription.frequency <> 'monthly' then
    raise exception using errcode = 'P0001', message = 'FINANCE_INVALID_SUBSCRIPTION';
  end if;
  if v_subscription.price <= 0 or (v_subscription.source_account_id is null and v_subscription.source_card_id is null) then
    raise exception using errcode = 'P0001', message = 'FINANCE_INVALID_SUBSCRIPTION';
  end if;

  v_type := case when v_subscription.source_card_id is not null
    then 'credit_card_expense'::public.transaction_type
    else 'expense'::public.transaction_type end;

  -- Preserve pre-migration materializations without rewriting/backfilling them.
  select t.id into v_transaction_id
    from public.transactions t
    where t.user_id = v_user_id
      and t.related_entity_id = p_subscription_id
      and t.cycle_start_date = p_cycle_start_date
      and t.type = v_type
    order by t.created_at, t.id
    limit 1;
  if found then
    return jsonb_build_object('status', 'already_processed', 'transaction_id', v_transaction_id);
  end if;

  insert into public.automated_charge_claims(user_id, charge_kind, entity_id, cycle_start_date)
    values(v_user_id, 'monthly_subscription', p_subscription_id, p_cycle_start_date)
    on conflict do nothing;
  get diagnostics v_claimed = row_count;
  if v_claimed = 0 then
    select transaction_id into v_transaction_id
      from public.automated_charge_claims
      where user_id = v_user_id and charge_kind = 'monthly_subscription'
        and entity_id = p_subscription_id and cycle_start_date = p_cycle_start_date;
    return jsonb_build_object('status', 'already_processed', 'transaction_id', v_transaction_id);
  end if;

  -- The helper validates/locks the selected account or card and applies exactly
  -- the same account/card effect as the former saveTransaction path.
  insert into public.transactions(
    user_id, account_id, category_id, type, amount, transaction_date,
    cycle_start_date, related_entity_id, notes
  ) values (
    v_user_id, v_subscription.source_account_id, v_subscription.category_id,
    v_type, v_subscription.price, p_transaction_date, p_cycle_start_date,
    p_subscription_id, 'Auto-charged subscription (lazy materialization)'
  ) returning id into v_transaction_id;

  perform public.apply_finance_transaction_effects(
    v_user_id, v_transaction_id, v_type, v_subscription.price,
    v_subscription.source_account_id, null, v_subscription.category_id,
    p_transaction_date, p_cycle_start_date,
    'Auto-charged subscription (lazy materialization)',
    v_subscription.source_card_id, null
  );

  update public.automated_charge_claims set transaction_id = v_transaction_id
    where user_id = v_user_id and charge_kind = 'monthly_subscription'
      and entity_id = p_subscription_id and cycle_start_date = p_cycle_start_date;
  return jsonb_build_object('status', 'created', 'transaction_id', v_transaction_id);
end;
$$;

create or replace function public.materialize_due_installment_charge(
  p_debt_id uuid,
  p_cycle_start_date date,
  p_transaction_date date
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_debt public.debts%rowtype;
  v_amount numeric;
  v_transaction_id uuid;
  v_claimed integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'FINANCE_LOGIN_REQUIRED';
  end if;

  select * into v_debt from public.debts
    where id = p_debt_id and user_id = v_user_id for update;
  if not found or v_debt.active is false or v_debt.type <> 'installment'
     or v_debt.card_id is null or v_debt.remaining_balance <= 0
     or v_debt.monthly_payment <= 0 then
    raise exception using errcode = 'P0001', message = 'FINANCE_INVALID_INSTALLMENT';
  end if;
  perform 1 from public.credit_cards c
    where c.id = v_debt.card_id and c.user_id = v_user_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'FINANCE_INVALID_REFERENCE';
  end if;

  select t.id into v_transaction_id from public.transactions t
    where t.user_id = v_user_id and t.related_entity_id = p_debt_id
      and t.cycle_start_date = p_cycle_start_date
      and t.type = 'credit_card_expense'
    order by t.created_at, t.id limit 1;
  if found then
    return jsonb_build_object('status', 'already_processed', 'transaction_id', v_transaction_id);
  end if;

  insert into public.automated_charge_claims(user_id, charge_kind, entity_id, cycle_start_date)
    values(v_user_id, 'card_installment', p_debt_id, p_cycle_start_date)
    on conflict do nothing;
  get diagnostics v_claimed = row_count;
  if v_claimed = 0 then
    select transaction_id into v_transaction_id
      from public.automated_charge_claims
      where user_id = v_user_id and charge_kind = 'card_installment'
        and entity_id = p_debt_id and cycle_start_date = p_cycle_start_date;
    return jsonb_build_object('status', 'already_processed', 'transaction_id', v_transaction_id);
  end if;

  -- Preserve the approved final-remainder rule.
  v_amount := least(v_debt.monthly_payment, v_debt.remaining_balance);
  insert into public.transactions(
    user_id, category_id, type, amount, transaction_date, cycle_start_date,
    related_entity_id, notes
  ) values (
    v_user_id, v_debt.category_id, 'credit_card_expense', v_amount,
    p_transaction_date, p_cycle_start_date, p_debt_id,
    'Auto-charged installment (lazy materialization)'
  ) returning id into v_transaction_id;

  insert into public.card_transactions(
    user_id, transaction_id, card_id, category_id, amount,
    transaction_date, billing_cycle_start, notes
  ) values (
    v_user_id, v_transaction_id, v_debt.card_id, v_debt.category_id, v_amount,
    p_transaction_date, p_cycle_start_date,
    'Auto-charged installment (lazy materialization)'
  );
  insert into public.debt_payments(
    user_id, transaction_id, debt_id, account_id, amount, paid_date, source
  ) values (
    v_user_id, v_transaction_id, p_debt_id, null, v_amount,
    p_transaction_date, 'installment_auto'
  );
  update public.debts set remaining_balance = greatest(0, remaining_balance - v_amount)
    where id = p_debt_id and user_id = v_user_id;

  update public.automated_charge_claims set transaction_id = v_transaction_id
    where user_id = v_user_id and charge_kind = 'card_installment'
      and entity_id = p_debt_id and cycle_start_date = p_cycle_start_date;
  return jsonb_build_object('status', 'created', 'transaction_id', v_transaction_id);
end;
$$;

revoke all on function public.materialize_due_subscription_charge(uuid,date,date)
  from public, anon;
revoke all on function public.materialize_due_installment_charge(uuid,date,date)
  from public, anon;
grant execute on function public.materialize_due_subscription_charge(uuid,date,date)
  to authenticated;
grant execute on function public.materialize_due_installment_charge(uuid,date,date)
  to authenticated;

notify pgrst, 'reload schema';

-- Card-linked installments advance once per CREDIT-CARD statement period.
-- The personal financial cycle (for example 25th-24th) is not a valid
-- installment cadence when the card cuts on another day (for example the 30th):
-- otherwise two monthly installments can land in the same card statement.
--
-- The existing RPC signature is preserved. p_cycle_start_date remains the
-- app's financial-cycle key for transaction/report grouping. Idempotency for
-- installments now uses the card statement period derived from
-- p_transaction_date + credit_cards.billing_cut_day.

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
  v_cut_day integer;
  v_amount numeric;
  v_transaction_id uuid;
  v_claimed integer;
  v_month_start date;
  v_month_end date;
  v_this_cut date;
  v_prev_month_start date;
  v_prev_month_end date;
  v_prev_cut date;
  v_next_month_start date;
  v_next_month_end date;
  v_next_cut date;
  v_period_start date;
  v_period_end date;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'FINANCE_LOGIN_REQUIRED';
  end if;

  select * into v_debt
    from public.debts
    where id = p_debt_id and user_id = v_user_id
    for update;

  if not found or v_debt.active is false or v_debt.type <> 'installment'
     or v_debt.card_id is null or v_debt.remaining_balance <= 0
     or v_debt.monthly_payment <= 0 then
    raise exception using errcode = 'P0001', message = 'FINANCE_INVALID_INSTALLMENT';
  end if;

  select c.billing_cut_day into v_cut_day
    from public.credit_cards c
    where c.id = v_debt.card_id and c.user_id = v_user_id
    for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'FINANCE_INVALID_REFERENCE';
  end if;

  v_month_start := date_trunc('month', p_transaction_date)::date;
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;
  v_this_cut := make_date(
    extract(year from v_month_start)::int,
    extract(month from v_month_start)::int,
    least(v_cut_day, extract(day from v_month_end)::int)
  );

  if p_transaction_date <= v_this_cut then
    v_prev_month_start := (v_month_start - interval '1 month')::date;
    v_prev_month_end := (v_month_start - interval '1 day')::date;
    v_prev_cut := make_date(
      extract(year from v_prev_month_start)::int,
      extract(month from v_prev_month_start)::int,
      least(v_cut_day, extract(day from v_prev_month_end)::int)
    );
    v_period_start := v_prev_cut + 1;
    v_period_end := v_this_cut;
  else
    v_next_month_start := (v_month_start + interval '1 month')::date;
    v_next_month_end := (v_next_month_start + interval '1 month - 1 day')::date;
    v_next_cut := make_date(
      extract(year from v_next_month_start)::int,
      extract(month from v_next_month_start)::int,
      least(v_cut_day, extract(day from v_next_month_end)::int)
    );
    v_period_start := v_this_cut + 1;
    v_period_end := v_next_cut;
  end if;

  -- Preserve any pre-migration materialization in this card statement period.
  select t.id into v_transaction_id
    from public.transactions t
    where t.user_id = v_user_id
      and t.related_entity_id = p_debt_id
      and t.type = 'credit_card_expense'
      and t.transaction_date between v_period_start and v_period_end
    order by t.created_at, t.id
    limit 1;
  if found then
    return jsonb_build_object('status', 'already_processed', 'transaction_id', v_transaction_id);
  end if;

  -- For card installments this key is now the CARD statement-period start.
  insert into public.automated_charge_claims(user_id, charge_kind, entity_id, cycle_start_date)
    values(v_user_id, 'card_installment', p_debt_id, v_period_start)
    on conflict do nothing;
  get diagnostics v_claimed = row_count;

  if v_claimed = 0 then
    select transaction_id into v_transaction_id
      from public.automated_charge_claims
      where user_id = v_user_id
        and charge_kind = 'card_installment'
        and entity_id = p_debt_id
        and cycle_start_date = v_period_start;
    return jsonb_build_object('status', 'already_processed', 'transaction_id', v_transaction_id);
  end if;

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
    p_transaction_date, v_period_start,
    'Auto-charged installment (lazy materialization)'
  );

  insert into public.debt_payments(
    user_id, transaction_id, debt_id, account_id, amount, paid_date, source
  ) values (
    v_user_id, v_transaction_id, p_debt_id, null, v_amount,
    p_transaction_date, 'installment_auto'
  );

  update public.debts
    set remaining_balance = greatest(0, remaining_balance - v_amount),
        active = case when remaining_balance - v_amount <= 0 then false else active end
    where id = p_debt_id and user_id = v_user_id;

  update public.automated_charge_claims
    set transaction_id = v_transaction_id
    where user_id = v_user_id
      and charge_kind = 'card_installment'
      and entity_id = p_debt_id
      and cycle_start_date = v_period_start;

  return jsonb_build_object('status', 'created', 'transaction_id', v_transaction_id);
end;
$$;

revoke all on function public.materialize_due_installment_charge(uuid,date,date)
  from public, anon;
grant execute on function public.materialize_due_installment_charge(uuid,date,date)
  to authenticated;

notify pgrst, 'reload schema';

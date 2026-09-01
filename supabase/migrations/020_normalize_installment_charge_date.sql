-- Keep lazy card-installment materialization in the financial cycle that owns
-- the charge. If the app is first opened after the card cut date, using the
-- current open date incorrectly pushes the installment into the next statement.
--
-- Existing installments created mid-cycle are never back-dated before their
-- creation date; later cycles use the cycle start date deterministically.

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
  v_effective_transaction_date date;
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

  v_amount := least(v_debt.monthly_payment, v_debt.remaining_balance);
  v_effective_transaction_date := greatest(p_cycle_start_date, v_debt.created_at::date);

  insert into public.transactions(
    user_id, category_id, type, amount, transaction_date, cycle_start_date,
    related_entity_id, notes
  ) values (
    v_user_id, v_debt.category_id, 'credit_card_expense', v_amount,
    v_effective_transaction_date, p_cycle_start_date, p_debt_id,
    'Auto-charged installment (lazy materialization)'
  ) returning id into v_transaction_id;

  insert into public.card_transactions(
    user_id, transaction_id, card_id, category_id, amount,
    transaction_date, billing_cycle_start, notes
  ) values (
    v_user_id, v_transaction_id, v_debt.card_id, v_debt.category_id, v_amount,
    v_effective_transaction_date, p_cycle_start_date,
    'Auto-charged installment (lazy materialization)'
  );
  insert into public.debt_payments(
    user_id, transaction_id, debt_id, account_id, amount, paid_date, source
  ) values (
    v_user_id, v_transaction_id, p_debt_id, null, v_amount,
    v_effective_transaction_date, 'installment_auto'
  );
  update public.debts set remaining_balance = greatest(0, remaining_balance - v_amount)
    where id = p_debt_id and user_id = v_user_id;

  update public.automated_charge_claims set transaction_id = v_transaction_id
    where user_id = v_user_id and charge_kind = 'card_installment'
      and entity_id = p_debt_id and cycle_start_date = p_cycle_start_date;
  return jsonb_build_object('status', 'created', 'transaction_id', v_transaction_id);
end;
$$;

revoke all on function public.materialize_due_installment_charge(uuid,date,date)
  from public, anon;
grant execute on function public.materialize_due_installment_charge(uuid,date,date)
  to authenticated;

notify pgrst, 'reload schema';

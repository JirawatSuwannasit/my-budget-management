-- Atomic writes for manual finance transactions. This migration only adds
-- functions; it does not rewrite transactions or recalculate balances.

create or replace function public.apply_finance_transaction_effects(
  p_user_id uuid, p_transaction_id uuid, p_type public.transaction_type,
  p_amount numeric, p_account_id uuid, p_destination_account_id uuid,
  p_category_id uuid, p_transaction_date date, p_cycle_start_date date,
  p_notes text, p_credit_card_id uuid, p_debt_id uuid
) returns void
language plpgsql security invoker set search_path = pg_catalog
as $$
declare
  v_balance numeric;
begin
  if p_type in ('income','expense','transfer','investment_transfer','credit_card_payment','debt_payment') and p_account_id is null then
    raise exception using errcode = 'P0001', message = 'FINANCE_SOURCE_REQUIRED';
  end if;
  if p_type in ('transfer','investment_transfer') and p_destination_account_id is null then
    raise exception using errcode = 'P0001', message = 'FINANCE_DESTINATION_REQUIRED';
  end if;
  if p_type = 'sinking_fund_reserve' and p_destination_account_id is not null and p_account_id is null then
    raise exception using errcode = 'P0001', message = 'FINANCE_SOURCE_REQUIRED';
  end if;
  if p_destination_account_id is not null and p_account_id = p_destination_account_id then
    raise exception using errcode = 'P0001', message = 'FINANCE_SAME_ACCOUNT';
  end if;

  -- Always lock account rows in UUID order. A missing row is deliberately
  -- indistinguishable from another user's row.
  if p_account_id is not null then
    select a.balance into v_balance from public.accounts a
      where a.id = p_account_id and a.user_id = p_user_id for update;
    if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
  end if;
  if p_destination_account_id is not null then
    perform 1 from public.accounts a where a.id = p_destination_account_id and a.user_id = p_user_id for update;
    if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
  end if;
  if p_category_id is not null then
    perform 1 from public.categories c where c.id = p_category_id and c.user_id = p_user_id;
    if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
  end if;

  if p_type = 'income' then
    update public.accounts set balance = balance + p_amount where id = p_account_id and user_id = p_user_id;
  elsif p_type in ('expense','credit_card_payment','debt_payment') then
    update public.accounts set balance = balance - p_amount where id = p_account_id and user_id = p_user_id
      returning balance into v_balance;
    if v_balance < 0 then raise exception using errcode='P0001', message='FINANCE_INSUFFICIENT_BALANCE'; end if;
  elsif p_type in ('transfer','investment_transfer') or (p_type='sinking_fund_reserve' and p_account_id is not null) then
    update public.accounts set balance = balance - p_amount where id = p_account_id and user_id = p_user_id
      returning balance into v_balance;
    if v_balance < 0 then raise exception using errcode='P0001', message='FINANCE_INSUFFICIENT_BALANCE'; end if;
    if p_destination_account_id is not null then
      update public.accounts set balance = balance + p_amount where id = p_destination_account_id and user_id = p_user_id;
    end if;
  end if;

  if p_type = 'credit_card_expense' then
    if p_credit_card_id is null then raise exception using errcode='P0001', message='FINANCE_CARD_REQUIRED'; end if;
    perform 1 from public.credit_cards c where c.id=p_credit_card_id and c.user_id=p_user_id;
    if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
    insert into public.card_transactions(user_id,transaction_id,card_id,category_id,amount,transaction_date,billing_cycle_start,notes)
      values(p_user_id,p_transaction_id,p_credit_card_id,p_category_id,p_amount,p_transaction_date,p_cycle_start_date,p_notes);
  elsif p_type = 'credit_card_payment' then
    if p_credit_card_id is null then raise exception using errcode='P0001', message='FINANCE_CARD_REQUIRED'; end if;
    perform 1 from public.credit_cards c where c.id=p_credit_card_id and c.user_id=p_user_id;
    if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
    insert into public.card_payments(user_id,transaction_id,card_id,account_id,amount,payment_date)
      values(p_user_id,p_transaction_id,p_credit_card_id,p_account_id,p_amount,p_transaction_date);
  elsif p_type = 'debt_payment' then
    if p_debt_id is null then raise exception using errcode='P0001', message='FINANCE_DEBT_REQUIRED'; end if;
    select d.remaining_balance into v_balance from public.debts d where d.id=p_debt_id and d.user_id=p_user_id for update;
    if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
    update public.debts set remaining_balance=greatest(0,remaining_balance-p_amount) where id=p_debt_id and user_id=p_user_id;
    insert into public.debt_payments(user_id,transaction_id,debt_id,account_id,amount,paid_date,source)
      values(p_user_id,p_transaction_id,p_debt_id,p_account_id,p_amount,p_transaction_date,'manual');
  end if;
end;
$$;

create or replace function public.reverse_finance_transaction_effects(p_user_id uuid, p_transaction_id uuid)
returns void language plpgsql security invoker set search_path = pg_catalog
as $$
declare v_tx public.transactions%rowtype; v_row record; v_balance numeric;
begin
  select * into v_tx from public.transactions where id=p_transaction_id and user_id=p_user_id for update;
  if not found then raise exception using errcode='P0001', message='FINANCE_TRANSACTION_NOT_FOUND'; end if;
  perform 1 from public.accounts a where a.user_id=p_user_id and a.id=any(array[v_tx.account_id,v_tx.destination_account_id]::uuid[]) order by a.id for update;

  if v_tx.type='credit_card_expense' then
    if not exists(select 1 from public.card_transactions where transaction_id=p_transaction_id and user_id=p_user_id) then
      raise exception using errcode='P0001', message='FINANCE_UNSAFE_CARD_EXPENSE';
    end if;
    for v_row in select dp.debt_id,dp.amount from public.debt_payments dp where dp.transaction_id=p_transaction_id and dp.user_id=p_user_id order by dp.debt_id for update loop
      perform 1 from public.debts d where d.id=v_row.debt_id and d.user_id=p_user_id for update;
      if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
      update public.debts set remaining_balance=remaining_balance+v_row.amount where id=v_row.debt_id and user_id=p_user_id;
    end loop;
    delete from public.debt_payments where transaction_id=p_transaction_id and user_id=p_user_id;
    delete from public.card_transactions where transaction_id=p_transaction_id and user_id=p_user_id;
    return;
  elsif v_tx.type='credit_card_payment' then
    if not exists(select 1 from public.card_payments where transaction_id=p_transaction_id and user_id=p_user_id) then
      raise exception using errcode='P0001', message='FINANCE_UNSAFE_CARD_PAYMENT';
    end if;
    for v_row in select cp.account_id,cp.amount from public.card_payments cp where cp.transaction_id=p_transaction_id and cp.user_id=p_user_id order by cp.account_id for update loop
      update public.accounts set balance=balance+v_row.amount where id=v_row.account_id and user_id=p_user_id;
      if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
    end loop;
    delete from public.card_payments where transaction_id=p_transaction_id and user_id=p_user_id;
    return;
  elsif v_tx.type='debt_payment' then
    if not exists(select 1 from public.debt_payments where transaction_id=p_transaction_id and user_id=p_user_id) then
      raise exception using errcode='P0001', message='FINANCE_UNSAFE_DEBT_PAYMENT';
    end if;
    for v_row in select dp.account_id,dp.debt_id,dp.amount from public.debt_payments dp where dp.transaction_id=p_transaction_id and dp.user_id=p_user_id order by dp.account_id,dp.debt_id for update loop
      update public.accounts set balance=balance+v_row.amount where id=v_row.account_id and user_id=p_user_id;
      if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
      update public.debts set remaining_balance=remaining_balance+v_row.amount where id=v_row.debt_id and user_id=p_user_id;
      if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
    end loop;
    delete from public.debt_payments where transaction_id=p_transaction_id and user_id=p_user_id;
    return;
  end if;

  if v_tx.account_id is not null then
    update public.accounts set balance=balance + case when v_tx.type='income' then -v_tx.amount else v_tx.amount end
      where id=v_tx.account_id and user_id=p_user_id returning balance into v_balance;
    if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
    if v_balance < 0 then raise exception using errcode='P0001', message='FINANCE_INSUFFICIENT_BALANCE'; end if;
  end if;
  if v_tx.type in ('transfer','investment_transfer','sinking_fund_reserve') and v_tx.destination_account_id is not null then
    update public.accounts set balance=balance-v_tx.amount where id=v_tx.destination_account_id and user_id=p_user_id returning balance into v_balance;
    if not found then raise exception using errcode='P0001', message='FINANCE_INVALID_REFERENCE'; end if;
    if v_balance < 0 then raise exception using errcode='P0001', message='FINANCE_INSUFFICIENT_BALANCE'; end if;
  end if;
end;
$$;

create or replace function public.create_finance_transaction(
 p_type public.transaction_type,p_amount numeric,p_account_id uuid default null,p_destination_account_id uuid default null,
 p_category_id uuid default null,p_transaction_date date default current_date,p_cycle_start_date date default current_date,
 p_related_entity_id uuid default null,p_notes text default null,p_credit_card_id uuid default null,p_debt_id uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
 if v_user is null then raise exception using errcode='P0001',message='FINANCE_LOGIN_REQUIRED'; end if;
 if p_amount is null or p_amount<=0 then raise exception using errcode='P0001',message='FINANCE_AMOUNT_POSITIVE'; end if;
 -- Lock all requested accounts deterministically before applying either side.
 perform 1 from public.accounts a where a.user_id=v_user and a.id=any(array[p_account_id,p_destination_account_id]::uuid[]) order by a.id for update;
 insert into public.transactions(user_id,account_id,destination_account_id,category_id,type,amount,transaction_date,cycle_start_date,related_entity_id,notes)
 values(v_user,p_account_id,p_destination_account_id,p_category_id,p_type,p_amount,p_transaction_date,p_cycle_start_date,p_related_entity_id,p_notes) returning id into v_id;
 perform public.apply_finance_transaction_effects(v_user,v_id,p_type,p_amount,p_account_id,p_destination_account_id,p_category_id,p_transaction_date,p_cycle_start_date,p_notes,p_credit_card_id,p_debt_id);
 return jsonb_build_object('transaction_id',v_id,'status','created');
end; $$;

create or replace function public.update_finance_transaction(
 p_transaction_id uuid,p_type public.transaction_type,p_amount numeric,p_account_id uuid default null,p_destination_account_id uuid default null,
 p_category_id uuid default null,p_transaction_date date default current_date,p_cycle_start_date date default current_date,
 p_related_entity_id uuid default null,p_notes text default null,p_credit_card_id uuid default null,p_debt_id uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_user uuid:=auth.uid(); v_old public.transactions%rowtype;
begin
 if v_user is null then raise exception using errcode='P0001',message='FINANCE_LOGIN_REQUIRED'; end if;
 if p_amount is null or p_amount<=0 then raise exception using errcode='P0001',message='FINANCE_AMOUNT_POSITIVE'; end if;
 select * into v_old from public.transactions where id=p_transaction_id and user_id=v_user for update;
 if not found then raise exception using errcode='P0001',message='FINANCE_TRANSACTION_NOT_FOUND'; end if;
 perform 1 from public.accounts a where a.user_id=v_user and a.id=any(array[v_old.account_id,v_old.destination_account_id,p_account_id,p_destination_account_id]::uuid[]) order by a.id for update;
 perform 1 from public.debts d where d.user_id=v_user and d.id in (select dp.debt_id from public.debt_payments dp where dp.transaction_id=p_transaction_id and dp.user_id=v_user union select p_debt_id where p_debt_id is not null) order by d.id for update;
 perform public.reverse_finance_transaction_effects(v_user,p_transaction_id);
 update public.transactions set account_id=p_account_id,destination_account_id=p_destination_account_id,category_id=p_category_id,type=p_type,amount=p_amount,transaction_date=p_transaction_date,cycle_start_date=p_cycle_start_date,related_entity_id=p_related_entity_id,notes=p_notes where id=p_transaction_id and user_id=v_user;
 perform public.apply_finance_transaction_effects(v_user,p_transaction_id,p_type,p_amount,p_account_id,p_destination_account_id,p_category_id,p_transaction_date,p_cycle_start_date,p_notes,p_credit_card_id,p_debt_id);
 return jsonb_build_object('transaction_id',p_transaction_id,'status','updated');
end; $$;

create or replace function public.delete_finance_transaction(p_transaction_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception using errcode='P0001',message='FINANCE_LOGIN_REQUIRED'; end if;
 perform public.reverse_finance_transaction_effects(v_user,p_transaction_id);
 delete from public.transactions where id=p_transaction_id and user_id=v_user;
 return jsonb_build_object('transaction_id',p_transaction_id,'status','deleted');
end; $$;

revoke all on function public.apply_finance_transaction_effects(uuid,uuid,public.transaction_type,numeric,uuid,uuid,uuid,date,date,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.reverse_finance_transaction_effects(uuid,uuid) from public,anon,authenticated;
revoke all on function public.create_finance_transaction(public.transaction_type,numeric,uuid,uuid,uuid,date,date,uuid,text,uuid,uuid) from public,anon;
revoke all on function public.update_finance_transaction(uuid,public.transaction_type,numeric,uuid,uuid,uuid,date,date,uuid,text,uuid,uuid) from public,anon;
revoke all on function public.delete_finance_transaction(uuid) from public,anon;
grant execute on function public.create_finance_transaction(public.transaction_type,numeric,uuid,uuid,uuid,date,date,uuid,text,uuid,uuid) to authenticated;
grant execute on function public.update_finance_transaction(uuid,public.transaction_type,numeric,uuid,uuid,uuid,date,date,uuid,text,uuid,uuid) to authenticated;
grant execute on function public.delete_finance_transaction(uuid) to authenticated;
notify pgrst, 'reload schema';

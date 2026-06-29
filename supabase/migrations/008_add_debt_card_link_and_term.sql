-- Phase: Installments as card-linked debts
-- Adds an optional credit-card link and a term (in months) to debts, so a
-- product installment can be tracked as a debt (type=installment) tied to a card.
-- Safe to run on existing databases; existing rows keep both columns null.

alter table public.debts
  add column if not exists card_id uuid;

alter table public.debts
  add column if not exists installment_months integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'debts_card_id_fkey'
      and conrelid = 'public.debts'::regclass
  ) then
    alter table public.debts
      add constraint debts_card_id_fkey
      foreign key (card_id)
      references public.credit_cards(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'debts_installment_months_check'
      and conrelid = 'public.debts'::regclass
  ) then
    alter table public.debts
      add constraint debts_installment_months_check
      check (installment_months is null or installment_months >= 1);
  end if;
end $$;

create index if not exists debts_card_id_idx
  on public.debts(card_id);

notify pgrst, 'reload schema';

create table public.quick_transaction_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type public.transaction_type not null check (type in ('expense', 'income', 'credit_card_expense')),
  amount numeric(14,2) check (amount is null or amount > 0),
  account_id uuid references public.accounts(id) on delete set null,
  destination_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  related_entity_id uuid,
  notes text,
  icon_key text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quick_transaction_templates_user_id_idx on public.quick_transaction_templates(user_id);
create index quick_transaction_templates_user_active_idx on public.quick_transaction_templates(user_id, active);
create index quick_transaction_templates_user_sort_idx on public.quick_transaction_templates(user_id, sort_order);

create trigger quick_transaction_templates_set_updated_at before update on public.quick_transaction_templates
for each row execute function public.set_updated_at();

alter table public.quick_transaction_templates enable row level security;
create policy "Users can read own quick transaction templates" on public.quick_transaction_templates for select using (auth.uid() = user_id);
create policy "Users can insert own quick transaction templates" on public.quick_transaction_templates for insert with check (auth.uid() = user_id);
create policy "Users can update own quick transaction templates" on public.quick_transaction_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own quick transaction templates" on public.quick_transaction_templates for delete using (auth.uid() = user_id);

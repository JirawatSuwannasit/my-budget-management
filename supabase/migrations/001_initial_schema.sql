-- Phase 2 schema for the private personal finance app.
-- Run once in a fresh Supabase project, or apply through the Supabase CLI later.

create extension if not exists pgcrypto;

create type public.account_type as enum ('main_bank', 'other_bank', 'cash', 'wallet', 'investment');
create type public.transaction_type as enum ('income', 'expense', 'transfer', 'credit_card_expense', 'credit_card_payment', 'debt_payment', 'investment_transfer', 'sinking_fund_reserve');
create type public.subscription_frequency as enum ('monthly', 'yearly');
create type public.card_statement_status as enum ('unpaid', 'partial', 'paid');
create type public.debt_type as enum ('interest_free', 'interest_bearing', 'installment', 'personal_loan', 'credit_card_debt', 'other');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'th' check (locale in ('th', 'en')),
  currency text not null default 'THB',
  financial_cycle_start_day integer not null default 25 check (financial_cycle_start_day between 1 and 28),
  signup_mode text not null default 'manual_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.account_type not null,
  balance numeric(14,2) not null default 0,
  is_cash_like boolean generated always as (type in ('main_bank', 'other_bank', 'cash', 'wallet')) stored,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income', 'expense', 'transfer', 'debt', 'subscription', 'sinking_fund', 'investment', 'other')),
  color text,
  icon_key text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, kind)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  destination_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  type public.transaction_type not null,
  amount numeric(14,2) not null check (amount >= 0),
  transaction_date date not null,
  cycle_start_date date not null,
  payment_method text,
  related_entity_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type = 'transfer' and destination_account_id is not null)
    or (type <> 'transfer')
  )
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  label text not null,
  amount numeric(14,2) not null check (amount >= 0),
  cycle_start_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, label, cycle_start_date)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  frequency public.subscription_frequency not null,
  price numeric(14,2) not null check (price >= 0),
  billing_day integer not null check (billing_day between 1 and 31),
  payment_method text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.annual_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  annual_amount numeric(14,2) not null check (annual_amount >= 0),
  due_date date,
  monthly_reserve numeric(14,2) generated always as (round(annual_amount / 12, 2)) stored,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.debt_type not null default 'other',
  original_amount numeric(14,2) not null check (original_amount >= 0),
  remaining_balance numeric(14,2) not null check (remaining_balance >= 0),
  interest_rate numeric(7,4) not null default 0 check (interest_rate >= 0),
  monthly_payment numeric(14,2) not null default 0 check (monthly_payment >= 0),
  bonus_payment_amount numeric(14,2) not null default 0 check (bonus_payment_amount >= 0),
  target_payoff_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  paid_date date not null,
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  billing_cut_day integer not null check (billing_cut_day between 1 and 31),
  payment_due_day integer not null check (payment_due_day between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_card_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  cycle_start date not null,
  cycle_end date not null,
  statement_amount_due numeric(14,2) not null default 0 check (statement_amount_due >= 0),
  due_date date not null,
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  remaining_payable numeric(14,2) generated always as (greatest(statement_amount_due - paid_amount, 0)) stored,
  status public.card_statement_status not null default 'unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cycle_end >= cycle_start)
);

create table public.card_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  statement_id uuid references public.credit_card_statements(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  transaction_date date not null,
  billing_cycle_start date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  statement_id uuid references public.credit_card_statements(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  payment_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bonus_months integer[] not null default array[4, 12],
  default_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger accounts_set_updated_at before update on public.accounts for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger annual_expenses_set_updated_at before update on public.annual_expenses for each row execute function public.set_updated_at();
create trigger debts_set_updated_at before update on public.debts for each row execute function public.set_updated_at();
create trigger debt_payments_set_updated_at before update on public.debt_payments for each row execute function public.set_updated_at();
create trigger credit_cards_set_updated_at before update on public.credit_cards for each row execute function public.set_updated_at();
create trigger credit_card_statements_set_updated_at before update on public.credit_card_statements for each row execute function public.set_updated_at();
create trigger card_transactions_set_updated_at before update on public.card_transactions for each row execute function public.set_updated_at();
create trigger card_payments_set_updated_at before update on public.card_payments for each row execute function public.set_updated_at();
create trigger app_settings_set_updated_at before update on public.app_settings for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.subscriptions enable row level security;
alter table public.annual_expenses enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.credit_cards enable row level security;
alter table public.credit_card_statements enable row level security;
alter table public.card_transactions enable row level security;
alter table public.card_payments enable row level security;
alter table public.app_settings enable row level security;

create policy "Users can read own profiles" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profiles" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profiles" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own profiles" on public.profiles for delete using (auth.uid() = user_id);

create policy "Users can read own app settings" on public.app_settings for select using (auth.uid() = user_id);
create policy "Users can insert own app settings" on public.app_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own app settings" on public.app_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own app settings" on public.app_settings for delete using (auth.uid() = user_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'accounts', 'categories', 'transactions', 'budgets', 'subscriptions', 'annual_expenses',
    'debts', 'debt_payments', 'credit_cards', 'credit_card_statements', 'card_transactions', 'card_payments'
  ] loop
    execute format('create policy "Users can read own %1$s" on public.%1$I for select using (auth.uid() = user_id)', table_name);
    execute format('create policy "Users can insert own %1$s" on public.%1$I for insert with check (auth.uid() = user_id)', table_name);
    execute format('create policy "Users can update own %1$s" on public.%1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
    execute format('create policy "Users can delete own %1$s" on public.%1$I for delete using (auth.uid() = user_id)', table_name);
  end loop;
end $$;

create index accounts_user_id_idx on public.accounts(user_id);
create index categories_user_kind_idx on public.categories(user_id, kind);
create index categories_user_active_idx on public.categories(user_id, active);
create index transactions_user_cycle_idx on public.transactions(user_id, cycle_start_date);
create index transactions_user_date_idx on public.transactions(user_id, transaction_date);
create index transactions_account_id_idx on public.transactions(account_id);
create index transactions_destination_account_id_idx on public.transactions(destination_account_id);
create index transactions_category_id_idx on public.transactions(category_id);
create index budgets_user_cycle_idx on public.budgets(user_id, cycle_start_date);
create index budgets_category_id_idx on public.budgets(category_id);
create index subscriptions_user_active_idx on public.subscriptions(user_id, active);
create index subscriptions_category_id_idx on public.subscriptions(category_id);
create index annual_expenses_user_active_idx on public.annual_expenses(user_id, active);
create index annual_expenses_category_id_idx on public.annual_expenses(category_id);
create index debts_user_active_idx on public.debts(user_id, active);
create index debt_payments_user_debt_idx on public.debt_payments(user_id, debt_id);
create index debt_payments_account_id_idx on public.debt_payments(account_id);
create index credit_cards_user_active_idx on public.credit_cards(user_id, active);
create index credit_card_statements_user_card_idx on public.credit_card_statements(user_id, card_id);
create index credit_card_statements_user_due_idx on public.credit_card_statements(user_id, due_date);
create index card_transactions_user_card_idx on public.card_transactions(user_id, card_id);
create index card_transactions_user_cycle_idx on public.card_transactions(user_id, billing_cycle_start);
create index card_transactions_statement_id_idx on public.card_transactions(statement_id);
create index card_transactions_category_id_idx on public.card_transactions(category_id);
create index card_payments_user_card_idx on public.card_payments(user_id, card_id);
create index card_payments_statement_id_idx on public.card_payments(statement_id);
create index card_payments_account_id_idx on public.card_payments(account_id);
create index app_settings_default_account_id_idx on public.app_settings(default_account_id);

create or replace function public.handle_new_private_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (user_id) do nothing;

  insert into public.app_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_private_user();

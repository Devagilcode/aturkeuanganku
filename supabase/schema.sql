create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount bigint not null check (amount > 0),
  category text not null,
  note text not null default '' check (char_length(note) <= 80),
  date date not null
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

alter table public.transactions enable row level security;

revoke all on public.transactions from anon, authenticated;
grant select, insert, delete on public.transactions to authenticated;

drop policy if exists "Users can read their own transactions" on public.transactions;
create policy "Users can read their own transactions"
  on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own transactions" on public.transactions;
create policy "Users can add their own transactions"
  on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own transactions" on public.transactions;
create policy "Users can delete their own transactions"
  on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  monthly_limit bigint not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

alter table public.budgets enable row level security;

revoke all on public.budgets from anon, authenticated;
grant select, insert, update, delete on public.budgets to authenticated;

drop policy if exists "Users can read their own budgets" on public.budgets;
create policy "Users can read their own budgets"
  on public.budgets for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own budgets" on public.budgets;
create policy "Users can add their own budgets"
  on public.budgets for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own budgets" on public.budgets;
create policy "Users can update their own budgets"
  on public.budgets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own budgets" on public.budgets;
create policy "Users can delete their own budgets"
  on public.budgets for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 60),
  target_amount bigint not null check (target_amount > 0),
  saved_amount bigint not null default 0 check (saved_amount >= 0),
  target_date date,
  created_at timestamptz not null default now()
);

create index if not exists savings_goals_user_created_idx
  on public.savings_goals (user_id, created_at desc);

alter table public.savings_goals enable row level security;

revoke all on public.savings_goals from anon, authenticated;
grant select, insert, update, delete on public.savings_goals to authenticated;

drop policy if exists "Users can read their own savings goals" on public.savings_goals;
create policy "Users can read their own savings goals"
  on public.savings_goals for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own savings goals" on public.savings_goals;
create policy "Users can add their own savings goals"
  on public.savings_goals for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own savings goals" on public.savings_goals;
create policy "Users can update their own savings goals"
  on public.savings_goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own savings goals" on public.savings_goals;
create policy "Users can delete their own savings goals"
  on public.savings_goals for delete to authenticated
  using ((select auth.uid()) = user_id);

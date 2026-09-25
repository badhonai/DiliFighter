-- ============================================================
-- DiliFighter v3 — Supabase schema (run ONCE)
-- Supabase Dashboard -> Database -> SQL Editor -> New query
-- -> paste this whole file -> Run
-- ============================================================

-- 1) Player profiles (one row per account)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  is_guest boolean not null default false,
  matches int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  coins int not null default 0,
  created_at timestamptz not null default now()
);

-- 2) Campaign progress (unlocks + star ratings)
create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  highest_level int not null default 1,
  stars jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 3) Inventory
create table if not exists public.inventory_items (
  user_id uuid references auth.users(id) on delete cascade,
  item_id text not null,
  qty int not null default 1,
  primary key (user_id, item_id)
);

-- 4) Per-user client settings (graphics quality etc.)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: every player can ONLY touch their own rows
alter table public.profiles enable row level security;
alter table public.player_progress enable row level security;
alter table public.inventory_items enable row level security;
alter table public.user_settings enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "progress_select_own" on public.player_progress for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.player_progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.player_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "items_select_own" on public.inventory_items for select using (auth.uid() = user_id);
create policy "items_insert_own" on public.inventory_items for insert with check (auth.uid() = user_id);
create policy "items_update_own" on public.inventory_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) Auto-create the player rows the moment an account is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, is_guest)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    coalesce((new.raw_user_meta_data->>'is_guest')::boolean, false)
  )
  on conflict (id) do nothing;

  insert into public.player_progress (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

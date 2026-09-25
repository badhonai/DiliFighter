-- ============================================================
-- DiliFighter v3 — Supabase schema v2 (run ONCE, replaces v1)
-- Dashboard -> Database -> SQL Editor -> New query -> paste -> Run
-- Safe to re-run if you already ran v1.
-- ============================================================

-- 1) Player profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  nickname text,
  is_guest boolean not null default false,
  matches int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  coins int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists nickname text;

-- 2) Campaign progress
create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  highest_level int not null default 1,
  stars jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 3) Per-user client settings
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 4) Friendships (requests + accepted)
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references auth.users(id) on delete cascade,
  addressee uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  unique (requester, addressee)
);

-- Row Level Security: every player can ONLY touch their own rows
alter table public.profiles enable row level security;
alter table public.player_progress enable row level security;
alter table public.user_settings enable row level security;
alter table public.friendships enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "progress_select_own" on public.player_progress for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.player_progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.player_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "friends_select_own" on public.friendships for select
  using (auth.uid() = requester or auth.uid() = addressee);
create policy "friends_insert_own" on public.friendships for insert
  with check (auth.uid() = requester);
create policy "friends_update_addressee" on public.friendships for update
  using (auth.uid() = addressee) with check (auth.uid() = addressee);
create policy "friends_delete_party" on public.friendships for delete
  using (auth.uid() = requester or auth.uid() = addressee);

-- Auto-create the player rows the moment an account is created
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

-- ============================================================
-- Public read RPCs (security definer: expose ONLY public fields,
-- RLS would otherwise hide other players entirely)
-- ============================================================

-- Search a player by exact username or nickname prefix
create or replace function public.search_players(q text)
returns table (id uuid, username text, nickname text, highest_level int, total_stars bigint)
language sql stable security definer set search_path = public
as $$
  select p.id, p.username, p.nickname,
         coalesce(pg.highest_level, 1) as highest_level,
         coalesce((select sum((v.value)::int) from jsonb_each(pg.stars) v), 0)::bigint as total_stars
  from profiles p
  left join player_progress pg on pg.user_id = p.id
  where p.username is not null
    and p.is_guest = false
    and p.id <> auth.uid()
    and (p.username = lower(btrim(q)) or p.nickname ilike btrim(q) || '%')
  order by p.username
  limit 10;
$$;

-- Leaderboard ranked by campaign progress (level, then stars)
create or replace function public.leaderboard()
returns table (rank bigint, user_id uuid, username text, nickname text, highest_level int, total_stars bigint)
language sql stable security definer set search_path = public
as $$
  select row_number() over (
           order by pg.highest_level desc,
                    coalesce((select sum((v.value)::int) from jsonb_each(pg.stars) v), 0) desc,
                    p.created_at asc
         ) as rank,
         p.id as user_id, p.username, p.nickname,
         pg.highest_level,
         coalesce((select sum((v.value)::int) from jsonb_each(pg.stars) v), 0)::bigint as total_stars
  from profiles p
  join player_progress pg on pg.user_id = p.id
  where p.username is not null and p.is_guest = false
  order by pg.highest_level desc, total_stars desc, p.created_at asc
  limit 50;
$$;

-- Friends + pending requests with public player info
create or replace function public.friend_list()
returns table (user_id uuid, username text, nickname text, highest_level int,
               status text, direction text, friendship_id bigint)
language sql stable security definer set search_path = public
as $$
  select
    case when f.requester = auth.uid() then f.addressee else f.requester end as user_id,
    p.username, p.nickname,
    coalesce(pg.highest_level, 1) as highest_level,
    f.status,
    case when f.requester = auth.uid() then 'out' else 'in' end as direction,
    f.id as friendship_id
  from friendships f
  join profiles p
    on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  left join player_progress pg on pg.user_id = p.id
  where f.requester = auth.uid() or f.addressee = auth.uid()
  order by (f.status = 'pending') desc, p.username;
$$;

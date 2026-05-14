create table if not exists public.battle_pass_seasons (
  id uuid primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_days integer not null default 30,
  skip_allowance integer not null default 3,
  is_active boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.battle_pass_rewards (
  id uuid primary key,
  season_id uuid not null references public.battle_pass_seasons(id) on delete cascade,
  milestone_day integer not null,
  reward_type text not null,
  silver_amount bigint not null default 0,
  item_label text,
  is_manual boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.battle_pass_unlocks (
  id uuid primary key,
  season_id uuid not null references public.battle_pass_seasons(id) on delete cascade,
  player_id text not null,
  reward_id uuid not null references public.battle_pass_rewards(id) on delete cascade,
  milestone_day integer not null,
  reward_type text not null,
  silver_amount bigint not null default 0,
  item_label text,
  status text not null default 'unlocked',
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz,
  delivered_at timestamptz,
  delivered_by text
);

create unique index if not exists battle_pass_rewards_season_day_idx
  on public.battle_pass_rewards (season_id, milestone_day);

create unique index if not exists battle_pass_unlocks_player_reward_idx
  on public.battle_pass_unlocks (season_id, player_id, reward_id);

create index if not exists battle_pass_unlocks_player_idx
  on public.battle_pass_unlocks (player_id);

create index if not exists battle_pass_unlocks_status_idx
  on public.battle_pass_unlocks (status);

create table if not exists public.shop_orders (
  id uuid primary key,
  submitter text not null,
  submitter_id text not null,
  discord_id text not null,
  player_id text not null,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  chest_location text,
  pickup_note text,
  rejection_reason text,
  resolved_by text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists shop_orders_submitter_idx
  on public.shop_orders (submitter_id);

create index if not exists shop_orders_status_idx
  on public.shop_orders (status);

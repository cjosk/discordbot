create table if not exists public.withdrawal_requests (
  id uuid primary key,
  submitter text not null,
  submitter_id text not null,
  player_id text not null,
  amount bigint not null check (amount > 0),
  status text not null default 'pending',
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.withdrawal_requests
  drop constraint if exists withdrawal_requests_status_check;

alter table public.withdrawal_requests
  add constraint withdrawal_requests_status_check
  check (status in ('pending', 'processing', 'approved', 'rejected'));

create index if not exists withdrawal_requests_submitter_id_idx
  on public.withdrawal_requests (submitter_id);

create index if not exists withdrawal_requests_player_id_idx
  on public.withdrawal_requests (player_id);

create index if not exists withdrawal_requests_status_idx
  on public.withdrawal_requests (status);

-- One row per user: current workspace payload (upsert from app).
-- DROP TABLE first so this runs even if the table never existed (no DROP POLICY on missing relation).

drop table if exists public.workspace_snapshots cascade;

create table public.workspace_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workspace_snapshots is
  'Current workspace JSON per user (export-backup shape); client upserts on user_id.';

create or replace function public.set_workspace_snapshots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspace_snapshots_set_updated_at on public.workspace_snapshots;
create trigger workspace_snapshots_set_updated_at
  before update on public.workspace_snapshots
  for each row
  execute procedure public.set_workspace_snapshots_updated_at();

alter table public.workspace_snapshots enable row level security;

create policy "workspace_snapshots_select_own"
  on public.workspace_snapshots
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "workspace_snapshots_insert_own"
  on public.workspace_snapshots
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "workspace_snapshots_update_own"
  on public.workspace_snapshots
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workspace_snapshots_delete_own"
  on public.workspace_snapshots
  for delete
  to authenticated
  using (auth.uid() = user_id);

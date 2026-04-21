-- One row per (user_id, calendar day UTC): automatic daily workspace backup.
-- The app upserts the same row whenever a snapshot sync succeeds that day (last state of day wins).
-- Plan retention (e.g. delete rows older than 90 days) separately if payload size grows.

create table if not exists public.workspace_snapshot_daily_backups (
  user_id uuid not null references auth.users (id) on delete cascade,
  backup_day date not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, backup_day)
);

comment on table public.workspace_snapshot_daily_backups is
  'Daily workspace JSON backup per user (UTC calendar day); same export-backup shape as workspace_snapshots.';

create index if not exists workspace_snapshot_daily_backups_user_created_idx
  on public.workspace_snapshot_daily_backups (user_id, created_at desc);

create or replace function public.set_workspace_snapshot_daily_backups_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspace_snapshot_daily_backups_set_updated_at
  on public.workspace_snapshot_daily_backups;
create trigger workspace_snapshot_daily_backups_set_updated_at
  before insert or update on public.workspace_snapshot_daily_backups
  for each row
  execute procedure public.set_workspace_snapshot_daily_backups_updated_at();

alter table public.workspace_snapshot_daily_backups enable row level security;

create policy "workspace_snapshot_daily_backups_select_own"
  on public.workspace_snapshot_daily_backups
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "workspace_snapshot_daily_backups_insert_own"
  on public.workspace_snapshot_daily_backups
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "workspace_snapshot_daily_backups_update_own"
  on public.workspace_snapshot_daily_backups
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workspace_snapshot_daily_backups_delete_own"
  on public.workspace_snapshot_daily_backups
  for delete
  to authenticated
  using (auth.uid() = user_id);

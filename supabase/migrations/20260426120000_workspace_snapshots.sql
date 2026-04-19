-- Append-only full workspace backups (same JSON as Settings → Export backup).
-- Client inserts after debounce; rows are kept (no automatic prune in app).

create table if not exists public.workspace_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.workspace_snapshots is
  'Full workspace JSON backups (mytradedesk-workspace-backup v1); RLS per user; prune old rows from the app.';

create index if not exists workspace_snapshots_user_created_idx
  on public.workspace_snapshots (user_id, created_at desc);

alter table public.workspace_snapshots enable row level security;

drop policy if exists "workspace_snapshots_select_own" on public.workspace_snapshots;
create policy "workspace_snapshots_select_own"
  on public.workspace_snapshots
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "workspace_snapshots_insert_own" on public.workspace_snapshots;
create policy "workspace_snapshots_insert_own"
  on public.workspace_snapshots
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "workspace_snapshots_delete_own" on public.workspace_snapshots;
create policy "workspace_snapshots_delete_own"
  on public.workspace_snapshots
  for delete
  to authenticated
  using (auth.uid() = user_id);

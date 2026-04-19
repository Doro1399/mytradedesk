-- Ensure updated_at bumps on INSERT as well as UPDATE (upsert insert path).

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
  before insert or update on public.workspace_snapshots
  for each row
  execute procedure public.set_workspace_snapshots_updated_at();

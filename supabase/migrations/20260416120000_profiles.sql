-- User profiles (plan / trial / account caps). Email is denormalized for UX; auth.users.email stays canonical.
-- Run via Supabase SQL editor or `supabase db push`.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free',
  premium_status text not null default 'none'
    check (premium_status in ('none', 'trialing', 'active', 'expired')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  accounts_limit integer not null default 2
    check (accounts_limit >= 1),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Workspace billing profile; email mirrors auth.users for display only.';

alter table public.profiles enable row level security;

-- Authenticated users can read their own row only.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- No insert/update/delete for end users — rows are created by triggers; plan/limit changes go through backend later.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  execute procedure public.sync_profile_email_from_auth();

-- Users created before this migration (run once after deploy).
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

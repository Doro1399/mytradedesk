-- Premium trial defaults for new signups + lazy client-side trial expiry (self row update).

alter table public.profiles
  alter column plan set default 'lite';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    plan,
    premium_status,
    trial_started_at,
    trial_ends_at,
    accounts_limit
  )
  values (
    new.id,
    new.email,
    'lite',
    'trialing',
    now(),
    now() + interval '14 days',
    1000000
  );
  return new;
end;
$$;

-- Allow authenticated users to update their own row (trial lazy expiry).
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

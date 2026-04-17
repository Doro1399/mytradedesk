-- Trial bootstrap + expiry via SECURITY DEFINER RPCs (bypass RLS; no UPDATE policy required on profiles).
-- Run in Supabase SQL Editor if migrations are not applied via CLI.

create or replace function public.bootstrap_premium_trial_if_needed()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    plan = 'lite',
    premium_status = 'trialing',
    trial_started_at = now(),
    trial_ends_at = now() + interval '14 days',
    accounts_limit = 1000000
  where id = auth.uid()
    and premium_status = 'none'
    and trial_started_at is null
    and trial_ends_at is null
    and lower(trim(coalesce(plan, ''))) in ('free', 'lite', '');
end;
$$;

revoke all on function public.bootstrap_premium_trial_if_needed() from public;
grant execute on function public.bootstrap_premium_trial_if_needed() to authenticated;

create or replace function public.expire_premium_trial_if_needed()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    premium_status = 'expired',
    plan = 'lite',
    accounts_limit = 2
  where id = auth.uid()
    and premium_status = 'trialing'
    and trial_ends_at is not null
    and now() > trial_ends_at;
end;
$$;

revoke all on function public.expire_premium_trial_if_needed() from public;
grant execute on function public.expire_premium_trial_if_needed() to authenticated;

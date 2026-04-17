-- Stripe billing + time-boxed Premium access (Supabase = app source of truth).

alter table public.profiles
  add column if not exists premium_access_until timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists subscription_interval text
    check (subscription_interval is null or subscription_interval in ('month', 'year')),
  add column if not exists cancel_at_period_end boolean not null default false;

comment on column public.profiles.premium_access_until is
  'Paid Premium access valid strictly before this instant (renew via invoice.paid).';
comment on column public.profiles.stripe_customer_id is 'Stripe Customer id (cus_…).';
comment on column public.profiles.stripe_subscription_id is 'Stripe Subscription id (sub_…); cleared when access fully ended.';
comment on column public.profiles.stripe_price_id is 'Primary recurring Stripe Price id on the subscription.';
comment on column public.profiles.subscription_interval is 'Recurring interval from Stripe price: month | year.';
comment on column public.profiles.cancel_at_period_end is
  'True when the user canceled renewal but keeps access until premium_access_until.';

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists profiles_stripe_subscription_id_idx
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

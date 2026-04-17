-- Optional Stripe billing period end for Premium (display in app settings).
alter table public.profiles
  add column if not exists subscription_current_period_end timestamptz;

comment on column public.profiles.subscription_current_period_end is 'Premium paid period end; set by billing webhooks later.';

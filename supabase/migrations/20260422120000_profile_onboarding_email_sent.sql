-- One welcome email after first successful sign-in (auth callback); existing users are marked sent.

alter table public.profiles
  add column if not exists onboarding_email_sent boolean not null default false;

comment on column public.profiles.onboarding_email_sent is
  'Transactional onboarding email has been sent after first session exchange.';

update public.profiles
set onboarding_email_sent = true;

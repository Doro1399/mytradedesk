-- Track transactional trial reminder emails (one-shot flags; cron / job sets when sent).

alter table public.profiles
  add column if not exists trial_day_7_sent boolean not null default false,
  add column if not exists trial_day_11_sent boolean not null default false,
  add column if not exists trial_day_14_sent boolean not null default false;

comment on column public.profiles.trial_day_7_sent is 'Trial day 7 reminder email has been sent.';
comment on column public.profiles.trial_day_11_sent is 'Trial day 11 reminder email has been sent.';
comment on column public.profiles.trial_day_14_sent is 'Trial day 14 reminder email has been sent.';

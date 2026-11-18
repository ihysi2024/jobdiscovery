-- When the person finished onboarding; returning users then land on the job list.
alter table preferences add column if not exists onboarded_at timestamptz;

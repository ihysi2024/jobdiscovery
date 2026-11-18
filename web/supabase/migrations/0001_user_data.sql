-- Per-user data for the web app. Run once in the Supabase SQL editor when
-- sign-in is added. Every table is private to its owner via row-level security.
-- Jobs themselves come from the read-only job_listings view (created by the poller).

create table if not exists profiles (
  user_id      uuid primary key references auth.users on delete cascade,
  name         text,
  headline     text,
  resume_path  text,                       -- file in Supabase Storage
  experience   jsonb not null default '[]', -- [{role, org, dates}]
  education    jsonb not null default '[]', -- [{degree, school, dates}]
  skills       text[] not null default '{}',
  updated_at   timestamptz not null default now()
);

-- Onboarding answers. Skipped sections stay null and aren't used for matching.
create table if not exists preferences (
  user_id      uuid primary key references auth.users on delete cascade,
  priorities   text[],        -- up to 3, in order
  tradeoffs    jsonb,         -- {give_for_get: "yes" | "maybe" | "no"}
  work_modes   text[],        -- onsite / hybrid / remote
  nyc_areas    text[],
  future       jsonb,         -- "if I didn't have to work..." and horizon picks
  lanes        text[],        -- ranked role directions from the market step
  updated_at   timestamptz not null default now()
);

-- Reactions in the quick-picks step and later likes/passes.
create table if not exists job_feedback (
  user_id      uuid not null references auth.users on delete cascade,
  posting_id   bigint not null,
  liked        boolean not null,
  reasons      text[] not null default '{}',
  note         text,
  created_at   timestamptz not null default now(),
  primary key (user_id, posting_id)
);

-- The "My jobs" board. posting_id is null for jobs added from elsewhere by link.
create table if not exists tracked_jobs (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users on delete cascade,
  posting_id   bigint,
  url          text,
  title        text,
  company      text,
  status       text not null default 'liked'
               check (status in ('liked', 'applied', 'interviewing', 'offer', 'closed')),
  focus        boolean not null default false,
  backup       boolean not null default false,
  applied_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, posting_id)
);
create index if not exists tracked_jobs_user on tracked_jobs (user_id, status);

create table if not exists plans (
  user_id         uuid primary key references auth.users on delete cascade,
  offer_by        date,
  date_flexible   boolean not null default true,
  hours_per_week  int,
  email_days      text[],     -- ['mon','wed','fri']
  email_time      time,
  timezone        text not null default 'America/New_York',
  updated_at      timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['profiles', 'preferences', 'job_feedback', 'tracked_jobs', 'plans'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists own_rows on %I', t);
    execute format(
      'create policy own_rows on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ===========================================================
-- FITGREEN Growth System — Postgres schema
--
-- The app runs on a localStorage demo datastore by default.
-- Running this file is only required to switch the backend
-- to Supabase/Postgres:
--
--   1. Supabase dashboard -> SQL Editor -> New query
--   2. Paste this file -> Run
--   3. Copy .env.example to .env and fill in
--      VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
--
-- Naming mirrors src/lib/dataService.ts exactly:
--   TS camelCase  <->  Postgres snake_case
-- Tables live in schema `gym` (see src/lib/supabaseClient.ts).
--
-- Re-running this file is safe: every statement is idempotent.
-- ===========================================================

create schema if not exists gym;

-- ---------------------------------------------------------
-- Enums
--
-- The TypeScript side uses string unions, so the database
-- uses text + CHECK rather than native enum types. That keeps
-- adding a value a pure code change instead of a migration.
-- ---------------------------------------------------------

create table if not exists gym.team_members (
  id            text primary key,
  created_at    timestamptz not null default now(),
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  name          text not null,
  email         text not null,
  phone         text not null,
  role          text not null check (role in ('ADMIN', 'SALES_MANAGER', 'SALES_EXEC')),
  color_index   integer not null default 0,
  active        boolean not null default true
);

create table if not exists gym.leads (
  id                 text primary key,
  created_at         timestamptz not null default now(),
  name               text not null,
  phone              text not null,
  email              text not null default '',
  goal               text not null check (goal in ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'FITNESS', 'PERSONAL_TRAINING', 'GENERAL')),
  workout_time       text not null check (workout_time in ('EARLY_MORNING', 'MORNING', 'AFTERNOON', 'EVENING', 'WEEKEND')),
  program            text,
  message            text not null default '',
  source             text not null check (source in ('WEBSITE', 'META_ADS', 'INSTAGRAM', 'WHATSAPP', 'REFERRAL', 'MANUAL')),
  status             text not null check (status in ('NEW', 'CONTACTED', 'QUALIFIED', 'TRIAL_BOOKED', 'TRIAL_ATTENDED', 'MEMBERSHIP', 'LOST')),
  score              integer not null default 0 check (score between 0 and 100),
  assigned_to_id     text references gym.team_members (id) on delete set null,
  requested_trial    boolean not null default false,
  next_follow_up_at  timestamptz,
  last_contacted_at  timestamptz,
  status_changed_at  timestamptz not null default now(),
  lost_reason        text,
  archived_at        timestamptz
);

create index if not exists leads_status_idx   on gym.leads (status);
create index if not exists leads_source_idx   on gym.leads (source);
create index if not exists leads_assignee_idx on gym.leads (assigned_to_id);
create index if not exists leads_created_idx  on gym.leads (created_at desc);

create table if not exists gym.lead_activities (
  id          text primary key,
  created_at  timestamptz not null default now(),
  lead_id     text not null references gym.leads (id) on delete cascade,
  type        text not null check (type in ('CALL', 'WHATSAPP', 'EMAIL', 'NOTE', 'MEETING', 'STATUS_CHANGE', 'TRIAL', 'CONVERSION')),
  summary     text not null,
  body        text not null default '',
  author_id   text references gym.team_members (id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index if not exists activities_lead_idx on gym.lead_activities (lead_id, occurred_at desc);

create table if not exists gym.follow_up_tasks (
  id           text primary key,
  created_at   timestamptz not null default now(),
  lead_id      text not null references gym.leads (id) on delete cascade,
  assignee_id  text not null references gym.team_members (id) on delete cascade,
  type         text not null check (type in ('CALL', 'WHATSAPP', 'EMAIL', 'TRIAL_REMINDER', 'MEMBERSHIP_FOLLOWUP')),
  title        text not null,
  notes        text not null default '',
  due_at       timestamptz not null,
  priority     text not null check (priority in ('HIGH', 'MEDIUM', 'LOW')),
  status       text not null check (status in ('PENDING', 'COMPLETED')),
  completed_at timestamptz
);

-- OVERDUE is derived from PENDING + due_at < now(), never stored,
-- so this index covers the default Follow-ups view.
create index if not exists tasks_open_idx on gym.follow_up_tasks (status, due_at);

create table if not exists gym.appointments (
  id           text primary key,
  created_at   timestamptz not null default now(),
  lead_id      text not null references gym.leads (id) on delete cascade,
  staff_id     text not null references gym.team_members (id) on delete cascade,
  type         text not null check (type in ('FREE_TRIAL', 'FITNESS_ASSESSMENT', 'PT_CONSULTATION', 'MEMBERSHIP_CONSULTATION')),
  date         date not null,
  time         text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  attended_at  timestamptz,
  status       text not null check (status in ('SCHEDULED', 'CONFIRMED', 'ATTENDED', 'NO_SHOW', 'CANCELLED')),
  notes        text not null default ''
);

create index if not exists appointments_date_idx on gym.appointments (date, time);
create index if not exists appointments_lead_idx on gym.appointments (lead_id);

create table if not exists gym.membership_plans (
  id                text primary key,
  created_at        timestamptz not null default now(),
  name              text not null,
  tagline           text not null default '',
  price             integer not null check (price >= 0),
  duration_months   integer not null default 1 check (duration_months > 0),
  features          text[] not null default '{}',
  highlight         boolean not null default false,
  sort_order        integer not null default 0
);

create table if not exists gym.members (
  id              text primary key,
  created_at      timestamptz not null default now(),
  lead_id         text not null references gym.leads (id) on delete restrict,
  plan_id         text not null references gym.membership_plans (id) on delete restrict,
  name            text not null,
  phone           text not null,
  email           text not null default '',
  salesperson_id  text not null references gym.team_members (id) on delete restrict,
  source          text not null check (source in ('WEBSITE', 'META_ADS', 'INSTAGRAM', 'WHATSAPP', 'REFERRAL', 'MANUAL')),
  start_date      date not null,
  expiry_date     date not null,
  amount_paid     integer not null default 0 check (amount_paid >= 0),
  payment_mode    text not null check (payment_mode in ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER')),
  active          boolean not null default true,
  constraint members_expiry_after_start check (expiry_date > start_date)
);

-- One membership per lead: the conversion is terminal.
create unique index if not exists members_lead_unique on gym.members (lead_id);
create index if not exists members_expiry_idx on gym.members (expiry_date);
create index if not exists members_sales_idx  on gym.members (salesperson_id);

create table if not exists gym.campaigns (
  id          text primary key,
  created_at  timestamptz not null default now(),
  name        text not null,
  platform    text not null check (platform in ('META', 'INSTAGRAM', 'WHATSAPP', 'GOOGLE')),
  objective   text not null default '',
  status      text not null check (status in ('ACTIVE', 'PAUSED', 'ENDED')),
  start_date  date not null,
  -- Empty string means "still running"; there is no planned end.
  end_date    text not null default '',
  -- Attribution key: leads roll up through this source, which is
  -- the same key campaign_metrics.leads was generated from.
  source      text not null check (source in ('WEBSITE', 'META_ADS', 'INSTAGRAM', 'WHATSAPP', 'REFERRAL', 'MANUAL'))
);

create index if not exists campaigns_source_idx on gym.campaigns (source);

create table if not exists gym.campaign_metrics (
  id           text primary key,
  created_at   timestamptz not null default now(),
  campaign_id  text not null references gym.campaigns (id) on delete cascade,
  date         date not null,
  spend        integer not null default 0 check (spend >= 0),
  impressions  integer not null default 0 check (impressions >= 0),
  reach        integer not null default 0 check (reach >= 0),
  clicks       integer not null default 0 check (clicks >= 0),
  leads        integer not null default 0 check (leads >= 0),
  constraint campaign_metrics_unique_day unique (campaign_id, date)
);

create index if not exists campaign_metrics_campaign_idx on gym.campaign_metrics (campaign_id, date);

create table if not exists gym.notifications (
  id            text primary key,
  created_at    timestamptz not null default now(),
  kind          text not null check (kind in ('NEW_LEAD', 'FOLLOW_UP_OVERDUE', 'FOLLOW_UP_DUE', 'TRIAL_BOOKED', 'TRIAL_REMINDER', 'TRIAL_ATTENDED', 'MEMBERSHIP_CONVERTED', 'MEMBER_EXPIRING', 'HIGH_INTENT_LEAD')),
  title         text not null,
  body          text not null default '',
  read          boolean not null default false,
  href          text,
  recipient_id  text references gym.team_members (id) on delete cascade
);

create index if not exists notifications_open_idx on gym.notifications (read, created_at desc);

-- ---------------------------------------------------------
-- Row level security
--
-- The anon key is public in the browser bundle, so the demo
-- policy below is permissive by design: anyone with the URL
-- can read the CRM. That is fine for a seeded demo and NOT
-- fine for real member data.
--
-- To lock it down, enable auth (team_members.auth_user_id is
-- already wired for this) and replace the policies below with
-- one keyed on auth.uid(), e.g.:
--
--   create policy "own leads only" on gym.leads
--     for all using (
--       assigned_to_id = (
--         select id from gym.team_members
--         where auth_user_id = auth.uid() limit 1
--       )
--     );
-- ---------------------------------------------------------

alter table gym.team_members      enable row level security;
alter table gym.leads             enable row level security;
alter table gym.lead_activities   enable row level security;
alter table gym.follow_up_tasks   enable row level security;
alter table gym.appointments      enable row level security;
alter table gym.membership_plans  enable row level security;
alter table gym.members           enable row level security;
alter table gym.campaigns         enable row level security;
alter table gym.campaign_metrics  enable row level security;
alter table gym.notifications     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'team_members', 'leads', 'lead_activities', 'follow_up_tasks',
    'appointments', 'membership_plans', 'members', 'campaigns',
    'campaign_metrics', 'notifications'
  ]
  loop
    execute format('drop policy if exists %I on gym.%I', t || '_demo_read', t);
    execute format('drop policy if exists %I on gym.%I', t || '_demo_write', t);

    execute format(
      'create policy %I on gym.%I for select using (true)',
      t || '_demo_read', t
    );
    execute format(
      'create policy %I on gym.%I for all using (true) with check (true)',
      t || '_demo_write', t
    );
  end loop;
end $$;
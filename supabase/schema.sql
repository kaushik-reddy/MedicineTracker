-- ============================================================================
-- MediTrack — Supabase schema
-- Run this in the Supabase SQL Editor (or as a migration).
-- Tables: members, medications, inventory, dose_logs
-- Row Level Security (RLS) is enabled; each row is owned by the signed-in user.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Members (household people the medications belong to)
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  full_name   text,
  initials    text,
  tone        text not null default 'brand',   -- brand | accent | sky | coral | warn
  image       text,                            -- profile photo (URL or data-URI)
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Medications
-- ---------------------------------------------------------------------------
create table if not exists public.medications (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id        uuid references public.members (id) on delete cascade,
  name             text not null,
  sub              text,                        -- generic name
  dosage           text,
  unit             text,
  frequency        text not null default 'Daily',
  time             text,                         -- e.g. '08:00 AM' (IST)
  label            text,                         -- e.g. '8 AM'
  period           text,                         -- am | day | pm
  tone             text not null default 'brand',
  image            text,                         -- pill/capsule photo (URL or data-URI)
  taken            boolean not null default false,
  skipped          boolean not null default false,
  scheduled_today  boolean not null default true,
  info             jsonb not null default '{}'::jsonb,  -- {category, purpose, instructions, sideEffects, warnings}
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Inventory (stock per medication)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id      uuid references public.members (id) on delete cascade,
  medication_id  uuid references public.medications (id) on delete cascade,
  name           text,
  detail         text,
  days           integer not null default 30,   -- days of stock remaining
  pct            integer not null default 100,  -- 0..100 for the progress bar
  tone           text not null default 'brand',
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Dose logs (history / audit trail)
-- ---------------------------------------------------------------------------
create table if not exists public.dose_logs (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id       uuid references public.members (id) on delete set null,
  medication_id   uuid references public.medications (id) on delete set null,
  name            text,
  dose            text,
  scheduled_time  text,                          -- when the dose was due
  marked_time     text,                          -- when it was actually marked (null if not taken)
  status          text not null default 'Taken'
                    check (status in ('Taken','Skipped','Missed','Upcoming','Snoozed','Rescheduled')),
  logged_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Symptom logs (how the user is feeling)
-- ---------------------------------------------------------------------------
create table if not exists public.symptoms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id   uuid references public.members (id) on delete set null,
  name        text,                              -- symptom description
  severity    text,                              -- Mild | Moderate | Severe
  mood        text,                              -- emoji describing overall mood
  logged_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Backfill columns on pre-existing tables
-- `create table if not exists` above will NOT add missing columns to a table
-- that already exists, so ensure every column exists here. Safe to re-run.
-- ---------------------------------------------------------------------------
-- members
alter table public.members add column if not exists owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.members add column if not exists name        text;
alter table public.members add column if not exists full_name   text;
alter table public.members add column if not exists initials    text;
alter table public.members add column if not exists tone        text not null default 'brand';
alter table public.members add column if not exists image       text;
alter table public.members add column if not exists created_at  timestamptz not null default now();

-- medications
alter table public.medications add column if not exists owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.medications add column if not exists member_id       uuid references public.members (id) on delete cascade;
alter table public.medications add column if not exists name            text;
alter table public.medications add column if not exists sub             text;
alter table public.medications add column if not exists dosage          text;
alter table public.medications add column if not exists unit            text;
alter table public.medications add column if not exists frequency       text not null default 'Daily';
alter table public.medications add column if not exists "time"          text;
alter table public.medications add column if not exists label           text;
alter table public.medications add column if not exists period          text;
alter table public.medications add column if not exists tone            text not null default 'brand';
alter table public.medications add column if not exists image           text;
alter table public.medications add column if not exists taken           boolean not null default false;
alter table public.medications add column if not exists skipped         boolean not null default false;
alter table public.medications add column if not exists scheduled_today boolean not null default true;
alter table public.medications add column if not exists info            jsonb not null default '{}'::jsonb;
alter table public.medications add column if not exists created_at      timestamptz not null default now();

-- inventory
alter table public.inventory add column if not exists owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.inventory add column if not exists member_id     uuid references public.members (id) on delete cascade;
alter table public.inventory add column if not exists medication_id uuid references public.medications (id) on delete cascade;
alter table public.inventory add column if not exists name          text;
alter table public.inventory add column if not exists detail        text;
alter table public.inventory add column if not exists days          integer not null default 30;
alter table public.inventory add column if not exists pct           integer not null default 100;
alter table public.inventory add column if not exists tone          text not null default 'brand';
alter table public.inventory add column if not exists created_at    timestamptz not null default now();

-- dose_logs
alter table public.dose_logs add column if not exists owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.dose_logs add column if not exists member_id      uuid references public.members (id) on delete set null;
alter table public.dose_logs add column if not exists medication_id  uuid references public.medications (id) on delete set null;
alter table public.dose_logs add column if not exists name           text;
alter table public.dose_logs add column if not exists dose           text;
alter table public.dose_logs add column if not exists scheduled_time text;
alter table public.dose_logs add column if not exists marked_time    text;
alter table public.dose_logs add column if not exists status         text not null default 'Taken';
alter table public.dose_logs add column if not exists logged_at      timestamptz not null default now();

-- Widen the status check to include Snoozed / Rescheduled events (idempotent).
alter table public.dose_logs drop constraint if exists dose_logs_status_check;
alter table public.dose_logs add constraint dose_logs_status_check
  check (status in ('Taken','Skipped','Missed','Upcoming','Snoozed','Rescheduled'));

-- symptoms
alter table public.symptoms add column if not exists owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.symptoms add column if not exists member_id  uuid references public.members (id) on delete set null;
alter table public.symptoms add column if not exists name       text;
alter table public.symptoms add column if not exists severity   text;
alter table public.symptoms add column if not exists mood       text;
alter table public.symptoms add column if not exists logged_at  timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_members_owner       on public.members (owner_id);
create index if not exists idx_meds_owner           on public.medications (owner_id);
create index if not exists idx_meds_member          on public.medications (member_id);
create index if not exists idx_inventory_owner      on public.inventory (owner_id);
create index if not exists idx_inventory_member     on public.inventory (member_id);
create index if not exists idx_inventory_med        on public.inventory (medication_id);
create index if not exists idx_dose_logs_owner      on public.dose_logs (owner_id);
create index if not exists idx_dose_logs_member     on public.dose_logs (member_id);
create index if not exists idx_dose_logs_logged_at  on public.dose_logs (logged_at desc);
create index if not exists idx_symptoms_owner       on public.symptoms (owner_id);
create index if not exists idx_symptoms_logged_at   on public.symptoms (logged_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — a user can only see and change their own rows
-- ---------------------------------------------------------------------------
alter table public.members     enable row level security;
alter table public.medications enable row level security;
alter table public.inventory   enable row level security;
alter table public.dose_logs   enable row level security;
alter table public.symptoms    enable row level security;

-- members
drop policy if exists "members: owner can read"   on public.members;
drop policy if exists "members: owner can write"  on public.members;
create policy "members: owner can read"  on public.members for select using (auth.uid() = owner_id);
create policy "members: owner can write" on public.members for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- medications
drop policy if exists "medications: owner can read"  on public.medications;
drop policy if exists "medications: owner can write" on public.medications;
create policy "medications: owner can read"  on public.medications for select using (auth.uid() = owner_id);
create policy "medications: owner can write" on public.medications for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- inventory
drop policy if exists "inventory: owner can read"  on public.inventory;
drop policy if exists "inventory: owner can write" on public.inventory;
create policy "inventory: owner can read"  on public.inventory for select using (auth.uid() = owner_id);
create policy "inventory: owner can write" on public.inventory for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- dose_logs
drop policy if exists "dose_logs: owner can read"  on public.dose_logs;
drop policy if exists "dose_logs: owner can write" on public.dose_logs;
create policy "dose_logs: owner can read"  on public.dose_logs for select using (auth.uid() = owner_id);
create policy "dose_logs: owner can write" on public.dose_logs for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- symptoms
drop policy if exists "symptoms: owner can read"  on public.symptoms;
drop policy if exists "symptoms: owner can write" on public.symptoms;
create policy "symptoms: owner can read"  on public.symptoms for select using (auth.uid() = owner_id);
create policy "symptoms: owner can write" on public.symptoms for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Daily health trackers (Water / Steps / Sleep)
-- One row per (owner, kind, day). `value` holds the day's total in the tracker's
-- native unit: water = millilitres, steps = step count, sleep = minutes.
-- ---------------------------------------------------------------------------
create table if not exists public.trackers (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('water','steps','sleep')),
  day         date not null,
  value       integer not null default 0,
  updated_at  timestamptz not null default now(),
  unique (owner_id, kind, day)
);

-- Backfill columns on a pre-existing table (safe to re-run).
alter table public.trackers add column if not exists owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.trackers add column if not exists kind       text not null default 'water';
alter table public.trackers add column if not exists day        date not null default current_date;
alter table public.trackers add column if not exists value      integer not null default 0;
alter table public.trackers add column if not exists updated_at timestamptz not null default now();

-- One row per (owner, kind, day) so client upserts can target the conflict.
create unique index if not exists uq_trackers_owner_kind_day on public.trackers (owner_id, kind, day);
create index if not exists idx_trackers_owner on public.trackers (owner_id);

alter table public.trackers enable row level security;
drop policy if exists "trackers: owner can read"  on public.trackers;
drop policy if exists "trackers: owner can write" on public.trackers;
create policy "trackers: owner can read"  on public.trackers for select using (auth.uid() = owner_id);
create policy "trackers: owner can write" on public.trackers for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Reload the PostgREST schema cache.
-- Columns added above via `alter table ... add column` are NOT visible to the
-- API (upserts silently drop them, e.g. a medication's `unit`) until PostgREST
-- reloads its cached schema. Running this makes new columns take effect at once.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

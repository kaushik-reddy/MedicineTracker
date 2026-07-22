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
                    check (status in ('Taken','Skipped','Missed','Upcoming')),
  logged_at       timestamptz not null default now()
);

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

-- ---------------------------------------------------------------------------
-- Row Level Security — a user can only see and change their own rows
-- ---------------------------------------------------------------------------
alter table public.members     enable row level security;
alter table public.medications enable row level security;
alter table public.inventory   enable row level security;
alter table public.dose_logs   enable row level security;

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

-- ============================================================
-- BatchKit — Initial Schema
-- Migration: 20260419000001_initial_schema
-- ============================================================

-- pgcrypto is pre-installed by Supabase in the extensions schema.
-- gen_random_uuid() is available natively in Postgres 13+, no extension needed.
-- We avoid gen_random_bytes() because it requires an explicit schema qualifier
-- (extensions.gen_random_bytes) in hosted Supabase migrations.

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('admin', 'member');
create type buy_round_status as enum ('open', 'locked', 'submitted', 'shipped', 'cancelled');
create type payment_status as enum ('unpaid', 'paid');

-- ============================================================
-- PROFILES
-- Extends auth.users. Created by trigger on auth.users insert.
-- ============================================================

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text not null,
  role         user_role not null default 'member',
  invited_by   uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

comment on table profiles is 'One row per authenticated user. Role controls admin vs member access.';

-- ============================================================
-- PENDING INVITES
-- Admin creates invite → email sent → member clicks link → account created
-- ============================================================

create table pending_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  invited_by  uuid not null references profiles (id) on delete cascade,
  token       text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '24 hours')
);

comment on table pending_invites is 'Invite tokens. 24h expiry. Admin can resend (creates new row).';
comment on column pending_invites.token is '64-char hex token (two concatenated UUID v4s). Sent in invite email link.';

create index pending_invites_email_idx on pending_invites (email);
create index pending_invites_token_idx on pending_invites (token);

-- ============================================================
-- PEPTIDES + VARIANTS
-- Admin-managed catalog. No prices here — prices are per buy round.
-- ============================================================

create table peptides (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_by  uuid not null references profiles (id) on delete restrict,
  created_at  timestamptz not null default now()
);

create table peptide_variants (
  id           uuid primary key default gen_random_uuid(),
  peptide_id   uuid not null references peptides (id) on delete cascade,
  weight_label text not null,   -- e.g. "40mg", "10mg"
  sku          text,
  created_at   timestamptz not null default now()
);

comment on table peptides is 'Peptide catalog. One entry per peptide name (e.g. MOTS-C).';
comment on table peptide_variants is 'Weight/dosage variants per peptide. One entry per size offered.';

-- ============================================================
-- BUY ROUNDS
-- One per peptide variant per purchase cycle.
-- price_per_kit is admin-only (enforced by RLS).
-- ============================================================

create table buy_rounds (
  id             uuid primary key default gen_random_uuid(),
  variant_id     uuid not null references peptide_variants (id) on delete restrict,
  price_per_kit  numeric(10,2) not null check (price_per_kit > 0),
  moq            integer not null default 100 check (moq > 0),
  status         buy_round_status not null default 'open',
  opened_at      timestamptz not null default now(),
  locked_at      timestamptz,
  submitted_at   timestamptz,
  shipped_at     timestamptz,
  notes          text,
  created_by     uuid not null references profiles (id) on delete restrict
);

comment on table buy_rounds is 'A single group purchase cycle for one peptide variant at one price.';
comment on column buy_rounds.price_per_kit is 'Admin-only. RLS blocks SELECT for member role.';
comment on column buy_rounds.moq is 'Minimum order quantity. Submission gated until total commitments >= moq.';

-- ============================================================
-- COMMITMENTS
-- One per member per buy round. kit_quantity min 1.
-- ============================================================

create table commitments (
  id            uuid primary key default gen_random_uuid(),
  buy_round_id  uuid not null references buy_rounds (id) on delete cascade,
  member_id     uuid not null references profiles (id) on delete cascade,
  kit_quantity  integer not null check (kit_quantity >= 1),
  committed_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (buy_round_id, member_id)
);

comment on table commitments is 'Member kit commitments. One row per member per buy round. Min 1 kit.';
comment on column commitments.kit_quantity is 'Must be >= 1. To withdraw, admin deletes the row directly.';

-- ============================================================
-- PAYMENTS
-- Admin marks payment received. One row = one payment event.
-- Binary in v1: either a full payment row exists (paid) or it doesn't (unpaid).
-- ============================================================

create table payments (
  id               uuid primary key default gen_random_uuid(),
  commitment_id    uuid not null references commitments (id) on delete cascade,
  amount_paid      numeric(10,2) not null check (amount_paid > 0),
  marked_paid_at   timestamptz not null default now(),
  marked_by        uuid not null references profiles (id) on delete restrict,
  notes            text    -- e.g. "Venmo @user on Apr 15"
);

comment on table payments is 'Payment records. Admin marks received. Cascade-deletes if commitment deleted.';

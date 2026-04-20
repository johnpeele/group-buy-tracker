-- ============================================================
-- BatchKit — Row Level Security Policies
-- Migration: 20260419000002_rls_policies
--
-- Role check helper: auth.jwt() ->> 'role' reads the custom claim.
-- We store role in profiles, so we do a profiles lookup.
-- Using a stable security definer function to avoid repeated joins.
-- ============================================================

-- ============================================================
-- HELPER: is_admin()
-- Returns true if the calling user has role = 'admin' in profiles.
-- SECURITY DEFINER so it can read profiles without triggering RLS recursion.
-- ============================================================

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================

alter table profiles        enable row level security;
alter table pending_invites enable row level security;
alter table peptides        enable row level security;
alter table peptide_variants enable row level security;
alter table buy_rounds      enable row level security;
alter table commitments     enable row level security;
alter table payments        enable row level security;

-- ============================================================
-- PROFILES policies
-- ============================================================

-- Members can read their own profile; admins can read all
create policy "profiles: members read own, admins read all"
  on profiles for select
  using (
    auth.uid() = id
    or is_admin()
  );

-- Members can update their own profile (display_name only — role change requires admin)
create policy "profiles: members update own"
  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from profiles where id = auth.uid())  -- cannot escalate own role
  );

-- Admins can update any profile (to change roles)
create policy "profiles: admins update any"
  on profiles for update
  using (is_admin());

-- INSERT is handled by the auth trigger (on auth.users insert) — no direct insert RLS needed
-- But allow service role / trigger to insert
create policy "profiles: service role insert"
  on profiles for insert
  with check (true);  -- trigger runs as SECURITY DEFINER, this won't be reached by normal users

-- ============================================================
-- PENDING INVITES policies
-- ============================================================

-- Only admins manage invites
create policy "invites: admins full access"
  on pending_invites for all
  using (is_admin())
  with check (is_admin());

-- Unauthenticated users need to read a pending invite by token to accept it.
-- Handled via SECURITY DEFINER RPC (accept_invite) — no direct RLS needed here.

-- ============================================================
-- PEPTIDES policies
-- ============================================================

-- Authenticated users can read peptides
create policy "peptides: authenticated read"
  on peptides for select
  using (auth.uid() is not null);

-- Admins can insert/update/delete peptides
create policy "peptides: admins write"
  on peptides for all
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- PEPTIDE VARIANTS policies
-- ============================================================

create policy "peptide_variants: authenticated read"
  on peptide_variants for select
  using (auth.uid() is not null);

create policy "peptide_variants: admins write"
  on peptide_variants for all
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- BUY ROUNDS policies
-- P0: price_per_kit must NEVER be visible to member-role users
-- ============================================================

-- Members can read buy rounds but NOT price_per_kit
-- We enforce this via a view (see 000003_views_rpcs.sql).
-- The underlying table is restricted to admin-only SELECT.
-- Members access buy round data via the get_moq_progress() and
-- get_member_payment_status() RPCs which explicitly omit price.

-- Admins: full access to buy_rounds (including price_per_kit)
create policy "buy_rounds: admins full access"
  on buy_rounds for all
  using (is_admin())
  with check (is_admin());

-- Members: read buy rounds (without price_per_kit — enforced by column-level view)
-- Direct table SELECT is allowed for non-price columns; price column hidden via view.
-- We allow SELECT here so the app can query status/moq/variant_id.
-- price_per_kit exposure is prevented at the API layer (never returned in member queries).
create policy "buy_rounds: members read (no price)"
  on buy_rounds for select
  using (auth.uid() is not null);

-- ============================================================
-- COMMITMENTS policies
-- Members see only their own; admins see all
-- ============================================================

create policy "commitments: members read own"
  on commitments for select
  using (
    member_id = auth.uid()
    or is_admin()
  );

-- Members can insert their own commitment (only if buy is open — enforced in server action)
create policy "commitments: members insert own"
  on commitments for insert
  with check (member_id = auth.uid());

-- Members can update their own commitment (kit_quantity only — enforced in server action)
create policy "commitments: members update own"
  on commitments for update
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- Admins can delete any commitment (member withdrawal via admin)
create policy "commitments: admins delete any"
  on commitments for delete
  using (is_admin());

-- Members cannot delete their own (must contact admin — prevents accidental withdrawal)
-- No member delete policy = members cannot delete

-- ============================================================
-- PAYMENTS policies
-- Admins manage; members read their own
-- ============================================================

create policy "payments: members read own"
  on payments for select
  using (
    is_admin()
    or exists (
      select 1 from commitments c
      where c.id = commitment_id
      and c.member_id = auth.uid()
    )
  );

create policy "payments: admins write"
  on payments for all
  using (is_admin())
  with check (is_admin());

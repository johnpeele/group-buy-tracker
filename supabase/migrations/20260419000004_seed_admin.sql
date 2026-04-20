-- ============================================================
-- BatchKit — Admin Bootstrap Seed
-- Migration: 20260419000004_seed_admin
--
-- This migration seeds the first admin.
-- EDIT the email below before running on a new environment.
-- The actual auth.users row is created when the admin signs up
-- via Supabase Auth. This migration pre-creates the profile row
-- so the trigger's on_conflict do nothing picks it up correctly,
-- OR it gets created by the trigger with role='admin' via raw_user_meta_data.
--
-- RECOMMENDED FLOW:
-- 1. Deploy this migration
-- 2. In Supabase Dashboard → Authentication → Users → Invite user
--    with email matching ADMIN_EMAIL below
-- 3. Admin clicks invite link, sets password
-- 4. Trigger fires, creates profile with role='admin' (from meta)
--    OR: run the UPDATE below if you sign up normally
-- ============================================================

-- The admin email. Change this before deploying to production.
do $$
declare
  admin_email text := 'admin@example.com';  -- ← CHANGE THIS
begin
  -- If the auth user already exists (e.g. local dev), ensure their profile has admin role
  update profiles
  set role = 'admin'
  where email = admin_email;

  -- If no profile exists yet (auth user hasn't signed up), create a placeholder
  -- that will be updated when they sign up (via on_conflict in the trigger)
  -- Note: we can't insert into profiles without a matching auth.users row (FK constraint)
  -- So we only do the update. The trigger handles insert with role='admin' if we pass meta.
  raise notice 'Admin bootstrap: set role=admin for % (if profile exists)', admin_email;
end;
$$;

-- ============================================================
-- To bootstrap admin in a fresh environment:
-- Option A (recommended): Use Supabase admin API to create the user
--   with raw_user_meta_data = '{"role": "admin", "display_name": "Admin"}'
--   The handle_new_user trigger will pick up the role from metadata.
--
-- Option B: After admin signs up normally, run:
--   UPDATE profiles SET role = 'admin' WHERE email = 'john.peele@gmail.com';
-- ============================================================

-- ============================================================
-- BatchKit — OAuth Support
-- Migration: 20260420000001_oauth_support
-- Updates handle_new_user trigger to support invite-gated OAuth.
-- ============================================================

-- Replace the trigger function defined in 20260419000003_views_rpcs.sql.
-- For OAuth sign-ins: only provision a profile when a matching pending invite exists.
-- For email sign-ins: unchanged (acceptInvite() creates the profile; trigger is a no-op via ON CONFLICT).

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text;
  v_invite   pending_invites;
begin
  v_provider := new.app_metadata->>'provider';

  if v_provider is distinct from 'email' then
    -- OAuth flow: find a valid pending invite for this email
    select * into v_invite
    from pending_invites
    where email = new.email
      and accepted_at is null
      and expires_at > now()
    limit 1;

    if not found then
      -- No invite — leave auth.users row but create no profile.
      -- The /auth/callback route will detect the missing profile and sign the user out.
      return new;
    end if;

    -- Create profile using the name provided by the OAuth provider
    insert into profiles (id, email, display_name, role, invited_by)
    values (
      new.id,
      new.email,
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'display_name',
        split_part(new.email, '@', 1)
      ),
      'member',
      v_invite.invited_by
    )
    on conflict (id) do nothing;

    -- Consume the invite
    update pending_invites
    set accepted_at = now()
    where id = v_invite.id;

    return new;
  end if;

  -- Email/password flow: admin bootstrap only.
  -- acceptInvite() runs first and creates the profile; ON CONFLICT makes this a no-op.
  insert into profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'member')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

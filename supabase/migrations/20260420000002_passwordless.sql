-- ============================================================
-- BatchKit — Passwordless Auth
-- Migration: 20260420000002_passwordless
-- Fixes accept_invite to upsert display_name instead of silently
-- ignoring it when a profile was pre-created by the handle_new_user
-- trigger (which fires when inviteUserByEmail creates the auth user).
-- ============================================================

create or replace function accept_invite(p_token text, p_display_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite  pending_invites;
  v_user_id uuid;
begin
  select * into v_invite
  from pending_invites
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    return json_build_object('error', 'invite_invalid_or_expired');
  end if;

  select id into v_user_id
  from auth.users
  where email = v_invite.email;

  if not found then
    return json_build_object('error', 'user_not_found');
  end if;

  -- Upsert so the display_name from the form always wins over the
  -- email-derived fallback set by the handle_new_user trigger.
  insert into profiles (id, email, display_name, role, invited_by)
  values (v_user_id, v_invite.email, p_display_name, 'member', v_invite.invited_by)
  on conflict (id) do update set display_name = excluded.display_name;

  update pending_invites
  set accepted_at = now()
  where id = v_invite.id;

  return json_build_object(
    'success', true,
    'email', v_invite.email,
    'user_id', v_user_id
  );
end;
$$;

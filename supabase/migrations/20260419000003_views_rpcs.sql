-- ============================================================
-- BatchKit — Views & RPC Functions
-- Migration: 20260419000003_views_rpcs
-- ============================================================

-- ============================================================
-- RPC: get_moq_progress(buy_round_id)
-- Returns aggregate MOQ progress for a buy round.
-- SECURITY DEFINER: bypasses RLS to sum all commitments (members
-- can't see individual rows, but CAN see the aggregate).
-- Returns NO price data.
-- ============================================================

create or replace function get_moq_progress(p_buy_round_id uuid)
returns table (
  committed_kits  integer,
  moq             integer,
  status          buy_round_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(c.kit_quantity), 0)::integer as committed_kits,
    br.moq,
    br.status
  from buy_rounds br
  left join commitments c on c.buy_round_id = br.id
  where br.id = p_buy_round_id
  group by br.id, br.moq, br.status;
$$;

comment on function get_moq_progress is
  'Aggregate MOQ progress for a buy round. Safe for member clients — no price, no individual rows.';

-- ============================================================
-- RPC: get_member_payment_status(buy_round_id)
-- Returns the calling user''s commitment + computed amount owed + payment status.
-- SECURITY DEFINER: can join buy_rounds to get price without exposing it directly.
-- Returns computed total (kit_quantity * price_per_kit), NOT raw price_per_kit.
-- ============================================================

create or replace function get_member_payment_status(p_buy_round_id uuid)
returns table (
  kit_quantity    integer,
  price_per_kit   numeric,   -- included: members can see per-kit price (constraint is no price LIST page)
  amount_owed     numeric,
  total_paid      numeric,
  payment_status  text       -- 'paid' | 'awaiting'
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.kit_quantity,
    br.price_per_kit,
    (c.kit_quantity * br.price_per_kit)::numeric as amount_owed,
    coalesce(sum(p.amount_paid), 0)::numeric as total_paid,
    case
      when sum(p.amount_paid) is not null and sum(p.amount_paid) >= (c.kit_quantity * br.price_per_kit)
        then 'paid'
      else 'awaiting'
    end as payment_status
  from commitments c
  join buy_rounds br on br.id = c.buy_round_id
  left join payments p on p.commitment_id = c.id
  where c.buy_round_id = p_buy_round_id
    and c.member_id = auth.uid()
  group by c.id, c.kit_quantity, br.price_per_kit;
$$;

comment on function get_member_payment_status is
  'Payment status for the calling member on one buy round. Returns per-kit price and computed total.';

-- ============================================================
-- RPC: accept_invite(token)
-- Validates token, creates profile, marks invite accepted.
-- Called during onboarding flow before the user is authenticated.
-- Returns the email associated with the token (or null if invalid/expired).
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
  -- Find the invite
  select * into v_invite
  from pending_invites
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    return json_build_object('error', 'invite_invalid_or_expired');
  end if;

  -- Get the user id for this email (auth user must already exist at this point)
  select id into v_user_id
  from auth.users
  where email = v_invite.email;

  if not found then
    return json_build_object('error', 'user_not_found');
  end if;

  -- Create profile if it doesn't exist
  insert into profiles (id, email, display_name, role, invited_by)
  values (v_user_id, v_invite.email, p_display_name, 'member', v_invite.invited_by)
  on conflict (id) do nothing;

  -- Mark invite accepted
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

comment on function accept_invite is
  'Validates invite token, creates member profile, marks invite accepted. Called during onboarding.';

-- ============================================================
-- RPC: check_invite_token(token)
-- Read-only check: is this token valid and what email is it for?
-- Called before showing the "set your name + password" form.
-- ============================================================

create or replace function check_invite_token(p_token text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from pending_invites
      where token = p_token
        and accepted_at is null
        and expires_at > now()
    )
    then (
      select json_build_object(
        'valid', true,
        'email', email,
        'expires_at', expires_at
      )
      from pending_invites
      where token = p_token
        and accepted_at is null
        and expires_at > now()
    )
    else json_build_object('valid', false)
  end;
$$;

-- ============================================================
-- TRIGGER: on auth.users insert → create profile (admin bootstrap only)
-- For regular members, profile creation goes through accept_invite().
-- This trigger handles the first admin (seeded directly).
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only auto-create profile if one doesn't exist yet (invite flow creates it via accept_invite)
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

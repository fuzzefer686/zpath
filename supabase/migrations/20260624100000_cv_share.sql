-- =============================================================================
-- ZPath CV Builder — T21: Public share-token + consent gate (plan §10, §13)
--
-- Design (compliance-first):
--   * A public share link is a TOKEN row in cv_shares — NOT a stored PII
--     snapshot. get_shared_cv() reads LIVE data via get_cv_document() and
--     REDACTS direct-contact PII (phone/email/address). Nothing public is
--     persisted, so there is no public PII artifact to purge (stronger than
--     §13.8's "snapshot ≤30 min": there is no snapshot at all).
--   * TTL ≤ 30 min (§13.8) enforced in enable_cv_share + checked in get_shared_cv.
--   * Revoke supported (§13.4 / §10): is_active=false kills the link immediately.
--   * Consent audit: policy_version + pii_acknowledged recorded per share (§13.3).
--   * Age gate (§13.2 / §13.7 layer 6): fail-CLOSED in SQL — unknown DOB or <16
--     is blocked here too (defense-in-depth; the API also calls isUnder16()).
--
-- Auth note (same as the rest of ZPath): custom auth, auth.uid() is ALWAYS NULL.
-- RPCs are SECURITY DEFINER, take the cookie-verified user id as an argument,
-- and execute is granted to service_role only (mentor/CV-RPC convention).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) cv_shares — one row per issued public share link (audit + state).
-- ---------------------------------------------------------------------------
create table if not exists public.cv_shares (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.zpath_users(id) on delete cascade,
  token            text not null unique,
  is_active        boolean not null default true,
  -- Consent audit (§13.3): which policy the user agreed to, and the explicit
  -- PII-publication acknowledgement.
  policy_version   text not null,
  pii_acknowledged boolean not null default false,
  created_at       timestamptz not null default now(),
  -- TTL (§13.8): link auto-dies at expires_at regardless of is_active.
  expires_at       timestamptz not null default (now() + interval '30 minutes'),
  revoked_at       timestamptz
);

create index if not exists idx_cv_shares_token  on public.cv_shares(token);
create index if not exists idx_cv_shares_user   on public.cv_shares(user_id, created_at desc);
-- Cheap scan for a cleanup job to drop expired/inactive rows.
create index if not exists idx_cv_shares_expiry on public.cv_shares(expires_at);

-- ---------------------------------------------------------------------------
-- 2) RLS — service_role only (no anon/authenticated access). Public reads go
--    exclusively through get_shared_cv() (SECURITY DEFINER), never the table.
-- ---------------------------------------------------------------------------
alter table public.cv_shares enable row level security;

drop policy if exists "cv_shares service_role only" on public.cv_shares;
create policy "cv_shares service_role only"
  on public.cv_shares
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.cv_shares from anon;
revoke all on table public.cv_shares from authenticated;
grant select, insert, update, delete on table public.cv_shares to service_role;

-- ---------------------------------------------------------------------------
-- 3) enable_cv_share — issue a fresh share token after consent + age gate.
--    Returns jsonb { token, expiresAt }. Raises on consent/age violations so
--    the API can map them to friendly messages.
-- ---------------------------------------------------------------------------
create or replace function public.enable_cv_share(
  p_user_id        uuid,
  p_policy_version text,
  p_pii_ack        boolean,
  p_ttl_minutes    int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dob     date;
  v_age     int;
  v_token   text;
  v_expires timestamptz;
begin
  -- Consent is mandatory (§13.3): explicit PII-publication acknowledgement.
  if coalesce(p_pii_ack, false) is not true then
    raise exception 'consent_required';
  end if;

  select date_of_birth into v_dob
  from public.cv_profiles where user_id = p_user_id;

  -- Fail-CLOSED age gate (mirrors lib/cv/ageGate.ts): unknown DOB → blocked.
  if v_dob is null then
    raise exception 'under16_or_unknown_dob';
  end if;
  v_age := date_part('year', age(v_dob))::int;  -- completed years
  if v_age < 16 then
    raise exception 'under16_blocked';
  end if;

  -- TTL clamped to [1, 30] minutes per §13.8 (ephemeral public link).
  v_expires := now() + make_interval(mins => least(greatest(coalesce(p_ttl_minutes, 30), 1), 30));

  -- One active share per user — revoke any prior active link first.
  update public.cv_shares
     set is_active = false, revoked_at = now()
   where user_id = p_user_id and is_active = true;

  -- 64-hex-char token from two UUIDs (no pgcrypto dependency).
  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');

  insert into public.cv_shares
    (user_id, token, is_active, policy_version, pii_acknowledged, expires_at)
  values
    (p_user_id, v_token, true, p_policy_version, true, v_expires);

  return jsonb_build_object('token', v_token, 'expiresAt', v_expires);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) get_shared_cv — public read by token. LIVE data, contact PII redacted.
--    Returns the CVDocument jsonb, or NULL when the token is missing / revoked
--    / expired. Does NOT widen RLS — it is the only public read path.
-- ---------------------------------------------------------------------------
create or replace function public.get_shared_cv(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_doc  jsonb;
begin
  select user_id into v_user
  from public.cv_shares
  where token = p_token
    and is_active = true
    and expires_at > now()
  limit 1;

  if v_user is null then
    return null;
  end if;

  v_doc := public.get_cv_document(v_user);

  -- Minimize public PII (§13): a public link must not expose direct-contact
  -- fields. Name/education/skills/certs stay (that is the point of a CV).
  v_doc := jsonb_set(v_doc, '{basic,phone}',   'null'::jsonb, false);
  v_doc := jsonb_set(v_doc, '{basic,email}',   'null'::jsonb, false);
  v_doc := jsonb_set(v_doc, '{basic,address}', 'null'::jsonb, false);

  return v_doc;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) revoke_cv_share — kill all active links for a user. Returns # revoked.
-- ---------------------------------------------------------------------------
create or replace function public.revoke_cv_share(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  update public.cv_shares
     set is_active = false, revoked_at = now()
   where user_id = p_user_id and is_active = true;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) get_active_cv_share — current live link for a user (for the owner's UI).
--    Returns jsonb { token, expiresAt } or NULL.
-- ---------------------------------------------------------------------------
create or replace function public.get_active_cv_share(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_row record;
begin
  select token, expires_at into v_row
  from public.cv_shares
  where user_id = p_user_id and is_active = true and expires_at > now()
  order by created_at desc
  limit 1;

  if v_row is null then
    return null;
  end if;

  return jsonb_build_object('token', v_row.token, 'expiresAt', v_row.expires_at);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Grants — service_role only (no PUBLIC execute), CV-RPC convention.
-- ---------------------------------------------------------------------------
revoke execute on function public.enable_cv_share(uuid, text, boolean, int) from public;
revoke execute on function public.get_shared_cv(text)                        from public;
revoke execute on function public.revoke_cv_share(uuid)                      from public;
revoke execute on function public.get_active_cv_share(uuid)                  from public;

grant execute on function public.enable_cv_share(uuid, text, boolean, int) to service_role;
grant execute on function public.get_shared_cv(text)                        to service_role;
grant execute on function public.revoke_cv_share(uuid)                      to service_role;
grant execute on function public.get_active_cv_share(uuid)                  to service_role;

-- =============================================================================
-- ZPath CV Builder — T21 share-token + consent unit test (plan §10, §13)
--
-- Proves:
--   * enable_cv_share requires consent (pii_ack) — raises 'consent_required'.
--   * Age gate is fail-CLOSED: <16 raises 'under16_blocked', NULL DOB raises
--     'under16_or_unknown_dob'. 16+ succeeds and returns a token.
--   * get_shared_cv returns LIVE CVDocument with contact PII REDACTED
--     (phone/email/address null) while name/blocks survive.
--   * TTL is enforced: an expired token reads as NULL.
--   * revoke_cv_share kills the link; only one active share per user.
--   * get_active_cv_share reflects active→null transitions.
--
-- SELF-CONTAINED: creates its own throwaway user + cv_profiles inside the
-- transaction (no dependency on any external seed) and ROLLBACKs — nothing
-- persists. Run on a fresh local stack (`supabase start`) or any linked DB.
--
-- Run:
--   psql "<DB_CONNECTION_URI>" -v ON_ERROR_STOP=1 -f supabase/tests/cv_share_test.sql
--   (or via the Supabase MCP execute_sql)
-- =============================================================================

begin;

do $$
declare
  uid uuid := '00000000-0000-0000-0000-00000021a001'; -- throwaway share-test user
  res jsonb;
  tok text;
  doc jsonb;
  n int;
  caught text;
begin
  -- --- Fixture: a 16+ user with full_name + contact PII set -----------------
  insert into public.zpath_users (id, username, password_hash, role)
  values (uid, 'share_test_user', 'x', 'user');

  insert into public.cv_profiles
    (user_id, full_name, date_of_birth, phone, email, address, target_career)
  values
    (uid, 'Nguyễn Văn Test', (now() - interval '20 years')::date,
     '0900000000', 'share-test@example.com', '123 Test Street, Hanoi',
     'Kỹ sư phần mềm');

  -- TEST 1: consent required (pii_ack=false → raise 'consent_required')
  caught := null;
  begin
    perform public.enable_cv_share(uid, '2026-01-01', false, 30);
  exception when others then caught := sqlerrm;
  end;
  if caught is distinct from 'consent_required' then
    raise exception 'TEST 1 FAILED: expected consent_required, got %', caught;
  end if;
  raise notice 'TEST 1 PASSED: consent required';

  -- TEST 2: 16+ with consent → token issued
  res := public.enable_cv_share(uid, '2026-01-01', true, 30);
  tok := res->>'token';
  if tok is null or length(tok) < 32 then
    raise exception 'TEST 2 FAILED: no/short token (%)', tok;
  end if;
  raise notice 'TEST 2 PASSED: token issued (len %)', length(tok);

  -- TEST 3: get_shared_cv returns doc with contact PII redacted, name intact
  doc := public.get_shared_cv(tok);
  if doc is null then raise exception 'TEST 3 FAILED: doc null for active token'; end if;
  if (doc->'basic'->>'fullName') is null then
    raise exception 'TEST 3 FAILED: fullName should survive a share';
  end if;
  if (doc->'basic'->>'phone') is not null
     or (doc->'basic'->>'email') is not null
     or (doc->'basic'->>'address') is not null then
    raise exception 'TEST 3 FAILED: contact PII NOT redacted (phone=%, email=%, addr=%)',
      doc->'basic'->>'phone', doc->'basic'->>'email', doc->'basic'->>'address';
  end if;
  raise notice 'TEST 3 PASSED: live read, contact PII redacted, name intact';

  -- TEST 4: get_active_cv_share reflects the live link
  res := public.get_active_cv_share(uid);
  if res is null or (res->>'token') <> tok then
    raise exception 'TEST 4 FAILED: active share mismatch (%)', res;
  end if;
  raise notice 'TEST 4 PASSED: get_active_cv_share returns current token';

  -- TEST 5: TTL enforced — force-expire then read NULL
  update public.cv_shares set expires_at = now() - interval '1 minute' where token = tok;
  if public.get_shared_cv(tok) is not null then
    raise exception 'TEST 5 FAILED: expired token still readable';
  end if;
  if public.get_active_cv_share(uid) is not null then
    raise exception 'TEST 5 FAILED: expired share counted as active';
  end if;
  raise notice 'TEST 5 PASSED: expired token reads NULL';

  -- TEST 6: re-issue, then revoke → link dies, count = 1
  res := public.enable_cv_share(uid, '2026-01-01', true, 30);
  tok := res->>'token';
  n := public.revoke_cv_share(uid);
  if n <> 1 then raise exception 'TEST 6 FAILED: revoke count = % (expected 1)', n; end if;
  if public.get_shared_cv(tok) is not null then
    raise exception 'TEST 6 FAILED: revoked token still readable';
  end if;
  raise notice 'TEST 6 PASSED: revoke kills the link';

  -- TEST 7: enabling re-revokes prior active (one active link per user)
  perform public.enable_cv_share(uid, '2026-01-01', true, 30);
  perform public.enable_cv_share(uid, '2026-01-01', true, 30);
  select count(*) into n from public.cv_shares where user_id = uid and is_active = true;
  if n <> 1 then raise exception 'TEST 7 FAILED: % active shares (expected 1)', n; end if;
  raise notice 'TEST 7 PASSED: only one active share per user';

  -- TEST 8: under-16 blocked (fail-closed age gate)
  update public.cv_profiles set date_of_birth = (now() - interval '14 years')::date
   where user_id = uid;
  caught := null;
  begin
    perform public.enable_cv_share(uid, '2026-01-01', true, 30);
  exception when others then caught := sqlerrm;
  end;
  if caught is distinct from 'under16_blocked' then
    raise exception 'TEST 8 FAILED: expected under16_blocked, got %', caught;
  end if;
  raise notice 'TEST 8 PASSED: <16 blocked';

  -- TEST 9: unknown DOB blocked (fail-closed)
  update public.cv_profiles set date_of_birth = null where user_id = uid;
  caught := null;
  begin
    perform public.enable_cv_share(uid, '2026-01-01', true, 30);
  exception when others then caught := sqlerrm;
  end;
  if caught is distinct from 'under16_or_unknown_dob' then
    raise exception 'TEST 9 FAILED: expected under16_or_unknown_dob, got %', caught;
  end if;
  raise notice 'TEST 9 PASSED: unknown DOB blocked';

  -- TEST 10: exactly-16 boundary allowed
  update public.cv_profiles set date_of_birth = (now() - interval '16 years')::date
   where user_id = uid;
  res := public.enable_cv_share(uid, '2026-01-01', true, 30);
  if (res->>'token') is null then
    raise exception 'TEST 10 FAILED: exactly-16 should be allowed';
  end if;
  raise notice 'TEST 10 PASSED: exactly-16 allowed';

  raise notice '=== ALL 10 SHARE TESTS PASSED ===';
end $$;

rollback;

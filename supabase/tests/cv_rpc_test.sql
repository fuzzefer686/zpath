-- =============================================================================
-- ZPath CV Builder — T05 RPC unit test (plan §3 / §6)
--
-- Proves:
--   * get_cv_document returns the full normalized CVDocument shape.
--   * certificates resolve display name + catalog validity from the cert catalog
--     (known IELTS -> inCatalog=true; unknown code -> inCatalog=false, fallback).
--   * completeness weights live in ONE place (cv_section_weights = 6 sections).
--   * compute_completeness_score is config-driven and rises/falls as blocks are
--     added/removed.
--
-- Depends on T04 seed (user student_ielts = ...b3 with full 6 blocks + IELTS).
--
-- Run:
--   psql "<DB_CONNECTION_URI>" -v ON_ERROR_STOP=1 -f supabase/tests/cv_rpc_test.sql
--   (or via the Supabase MCP execute_sql)
--
-- Wrapped in a transaction and ROLLBACK; no test data persists.
-- =============================================================================

begin;

do $$
declare
  uid uuid := '00000000-0000-0000-0000-0000000000b3'; -- student_ielts
  empty_uid uuid := '00000000-0000-0000-0000-0000009999ff';
  doc jsonb;
  cert jsonb;
  score int;
  weight_rows int;
  weight_sum numeric;
  k text;
begin
  -- TEST 1: CVDocument shape
  doc := public.get_cv_document(uid);
  if doc is null then raise exception 'TEST 1 FAILED: doc null'; end if;
  foreach k in array array['basic','summary','education','experiences','skills',
    'certificates','awards','activities','personality','sectionsConfig',
    'completeness','meta'] loop
    if not (doc ? k) then raise exception 'TEST 1 FAILED: missing key %', k; end if;
  end loop;
  if not (doc->'meta' ? 'locale' and doc->'meta' ? 'generatedAt') then
    raise exception 'TEST 1 FAILED: meta missing locale/generatedAt';
  end if;
  raise notice 'TEST 1 PASSED: CVDocument has all keys + meta';

  -- TEST 2: basic/summary populated
  if (doc->'basic'->>'fullName') is null then raise exception 'TEST 2 FAILED: fullName null'; end if;
  if (doc->'summary'->>'targetMajorCode') is null then raise exception 'TEST 2 FAILED: targetMajorCode null'; end if;
  raise notice 'TEST 2 PASSED: basic/summary populated';

  -- TEST 3: known cert resolved from catalog
  cert := doc->'certificates'->0;
  if cert is null then raise exception 'TEST 3 FAILED: no certificate'; end if;
  if (cert->>'code') <> 'IELTS' then raise exception 'TEST 3 FAILED: code=%', cert->>'code'; end if;
  if (cert->>'inCatalog')::boolean is not true then raise exception 'TEST 3 FAILED: IELTS not inCatalog'; end if;
  if (cert->>'displayName') <> 'IELTS' then raise exception 'TEST 3 FAILED: displayName=%', cert->>'displayName'; end if;
  raise notice 'TEST 3 PASSED: IELTS resolved from catalog';

  -- TEST 4: unknown cert -> inCatalog=false + fallback displayName
  insert into public.cv_certificates (id, user_id, cert_type_code, score)
  values ('00000000-0000-0000-0000-0000000fffff', uid, 'FAKE_CERT_XYZ', '1');
  doc := public.get_cv_document(uid);
  if (select count(*) from jsonb_array_elements(doc->'certificates') c
      where c->>'code'='FAKE_CERT_XYZ' and (c->>'inCatalog')::boolean = false
        and c->>'displayName'='FAKE_CERT_XYZ') <> 1 then
    raise exception 'TEST 4 FAILED: unknown cert not flagged';
  end if;
  delete from public.cv_certificates where id='00000000-0000-0000-0000-0000000fffff';
  raise notice 'TEST 4 PASSED: unknown cert flagged inCatalog=false';

  -- TEST 5: weights in one place
  select count(*), sum(weight) into weight_rows, weight_sum from public.cv_section_weights();
  if weight_rows <> 6 then raise exception 'TEST 5 FAILED: % weight rows', weight_rows; end if;
  raise notice 'TEST 5 PASSED: cv_section_weights = 6 sections (total %)', weight_sum;

  -- TEST 6: full profile = 100
  score := public.compute_completeness_score(uid);
  if score <> 100 then raise exception 'TEST 6 FAILED: full score=%', score; end if;
  raise notice 'TEST 6 PASSED: full profile completeness = 100';

  -- TEST 7: completeness rises/falls with blocks
  insert into public.zpath_users (id, username, password_hash, role)
  values (empty_uid, 'rpc_test_empty', 'x', 'user');
  insert into public.cv_profiles (user_id) values (empty_uid);
  if public.compute_completeness_score(empty_uid) <> 0 then
    raise exception 'TEST 7 FAILED: empty score <> 0';
  end if;
  update public.cv_profiles set full_name = 'Test' where user_id = empty_uid;
  declare s1 int; s2 int; begin
    s1 := public.compute_completeness_score(empty_uid);
    if s1 <= 0 then raise exception 'TEST 7 FAILED: basic did not raise score'; end if;
    insert into public.cv_skills (user_id, name) values (empty_uid, 'X');
    s2 := public.compute_completeness_score(empty_uid);
    if s2 <= s1 then raise exception 'TEST 7 FAILED: block did not raise score (% -> %)', s1, s2; end if;
    delete from public.cv_skills where user_id = empty_uid;
    if public.compute_completeness_score(empty_uid) <> s1 then
      raise exception 'TEST 7 FAILED: score did not fall after removing block';
    end if;
    raise notice 'TEST 7 PASSED: completeness rises/falls with blocks (% -> %)', s1, s2;
  end;
  delete from public.zpath_users where id = empty_uid;

  raise notice '=== ALL CV RPC TESTS PASSED ===';
end $$;

rollback;

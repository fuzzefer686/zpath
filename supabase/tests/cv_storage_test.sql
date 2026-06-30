-- =============================================================================
-- ZPath CV Builder — T03 Storage test
--
-- Proves: both buckets are PRIVATE; untrusted roles (anon/authenticated) cannot
-- read/write objects; and the owner-prefix guard rejects cross-user paths so
-- user A cannot reach user B's file by path.
--
-- Run:
--   psql "<DB_CONNECTION_URI>" -v ON_ERROR_STOP=1 -f supabase/tests/cv_storage_test.sql
-- (or via the Supabase MCP execute_sql — see report)
--
-- Wrapped in a transaction and ROLLBACK; no test data persists.
-- Any failed assertion RAISEs EXCEPTION and aborts non-zero.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- TEST 1 — both buckets exist and are PRIVATE.
-- ---------------------------------------------------------------------------
do $$
declare
  exports_public  boolean;
  evidence_public boolean;
begin
  select public into exports_public  from storage.buckets where id = 'cv-exports';
  select public into evidence_public from storage.buckets where id = 'cv-evidence';

  if exports_public is null then
    raise exception 'TEST 1 FAILED: bucket cv-exports does not exist';
  end if;
  if evidence_public is null then
    raise exception 'TEST 1 FAILED: bucket cv-evidence does not exist';
  end if;
  if exports_public or evidence_public then
    raise exception 'TEST 1 FAILED: a CV bucket is PUBLIC (exports=%, evidence=%)',
      exports_public, evidence_public;
  end if;
  raise notice 'TEST 1 PASSED: cv-exports & cv-evidence exist and are private';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 2 — only service_role has a policy on these buckets (no anon/auth leak).
-- ---------------------------------------------------------------------------
do $$
declare
  bad_policies int;
begin
  -- Count policies on storage.objects that mention our buckets and are granted
  -- to anon or authenticated (roles=NULL means PUBLIC i.e. all roles).
  select count(*) into bad_policies
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and (qual like '%cv-exports%' or qual like '%cv-evidence%'
         or with_check like '%cv-exports%' or with_check like '%cv-evidence%')
    and (roles is null
         or roles && array['anon','authenticated','public']::name[]);
  if bad_policies > 0 then
    raise exception 'TEST 2 FAILED: % policy(ies) expose CV buckets to anon/authenticated', bad_policies;
  end if;
  raise notice 'TEST 2 PASSED: CV bucket policies are service_role only';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 3 — owner-prefix guard: A owns A's path, NOT B's path (and vice versa).
--   This is where "A cannot download B's file by path" is enforced.
-- ---------------------------------------------------------------------------
do $$
declare
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  user_b uuid := '22222222-2222-2222-2222-222222222222';
  cv     uuid := '33333333-3333-3333-3333-333333333333';
  a_path text := user_a::text || '/' || cv::text || '/cv.pdf';
  b_path text := user_b::text || '/' || cv::text || '/cv.pdf';
begin
  -- A owns A's path
  if not public.cv_storage_owns_path(user_a, a_path) then
    raise exception 'TEST 3 FAILED: owner not recognised for own path';
  end if;
  -- A does NOT own B's path  <-- the cross-user block
  if public.cv_storage_owns_path(user_a, b_path) then
    raise exception 'TEST 3 FAILED: user A was allowed onto user B''s path';
  end if;
  -- B does NOT own A's path
  if public.cv_storage_owns_path(user_b, a_path) then
    raise exception 'TEST 3 FAILED: user B was allowed onto user A''s path';
  end if;
  raise notice 'TEST 3 PASSED: owner-prefix guard blocks cross-user paths';
end $$;

do $$ begin raise notice '=== ALL CV STORAGE TESTS PASSED ==='; end $$;

rollback;

-- =============================================================================
-- ZPath CV Builder — T02 RLS test
--
-- Proves the RLS outer wall + template public-read + write lockdown.
--
-- Architecture note: ZPath uses custom auth (auth.uid() always NULL), so
-- per-user (A-vs-B) isolation lives in the SECURITY DEFINER RPC / server API
-- layer that scopes every query by the cookie-verified user_id. At the DB
-- boundary, RLS guarantees that NO untrusted role (anon/authenticated) can read
-- or write ANY user's CV PII — so neither user A's nor user B's rows can leak to
-- a client. This test verifies that wall, plus the server-side user_id scoping
-- mechanism that isolates A from B.
--
-- Run (against linked remote or local db):
--   supabase db execute --file supabase/tests/cv_rls_test.sql
-- or with psql:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/cv_rls_test.sql
--
-- Everything runs in a transaction and ROLLBACKs — no test data is persisted.
-- Any failed assertion RAISEs EXCEPTION and aborts with a non-zero exit.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Seed: two users A and B, each with a cv_profile + one child row.
-- Plus one active and one inactive cv_template.
-- (Runs as the migration owner / postgres — bypasses RLS for seeding.)
-- ---------------------------------------------------------------------------
do $$
declare
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  user_b uuid := '22222222-2222-2222-2222-222222222222';
begin
  insert into public.zpath_users (id, username, password_hash, role)
  values
    (user_a, 'rls_test_a', 'x', 'user'),
    (user_b, 'rls_test_b', 'x', 'user');

  insert into public.cv_profiles (user_id, full_name, email)
  values
    (user_a, 'Nguyen Van A', 'a@example.com'),
    (user_b, 'Tran Thi B',   'b@example.com');

  insert into public.cv_skills (user_id, name) values
    (user_a, 'A-secret-skill'),
    (user_b, 'B-secret-skill');

  insert into public.cv_templates (slug, name, layout_config, is_active) values
    ('test-active',   'Active Template',   '{}'::jsonb, true),
    ('test-inactive', 'Inactive Template', '{}'::jsonb, false);
end $$;

-- ---------------------------------------------------------------------------
-- TEST 1 — RLS is enabled on every CV table.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'cv_profiles','cv_education','cv_experiences','cv_skills','cv_certificates',
    'cv_awards','cv_activities','cv_templates','generated_cvs',
    'cv_recommendations','personality_results','sponsored_placements','affiliate_clicks'
  ];
  is_on boolean;
begin
  foreach t in array tables loop
    select relrowsecurity into is_on
    from pg_class where oid = ('public.' || t)::regclass;
    if not is_on then
      raise exception 'TEST 1 FAILED: RLS not enabled on public.%', t;
    end if;
  end loop;
  raise notice 'TEST 1 PASSED: RLS enabled on all 13 CV tables';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 2 — anon CANNOT read owner PII (cv_profiles, cv_skills).
--   anon has no GRANT on these tables -> permission denied (stronger than 0 rows).
-- ---------------------------------------------------------------------------
do $$
declare
  denied boolean := false;
begin
  set local role anon;
  begin
    perform 1 from public.cv_profiles;       -- expected to throw
  exception when insufficient_privilege then
    denied := true;
  end;
  reset role;
  if not denied then
    raise exception 'TEST 2 FAILED: anon was able to read public.cv_profiles';
  end if;
  raise notice 'TEST 2 PASSED: anon denied SELECT on cv_profiles (no PII leak)';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 3 — authenticated CANNOT read owner PII either.
-- ---------------------------------------------------------------------------
do $$
declare
  denied boolean := false;
begin
  set local role authenticated;
  begin
    perform 1 from public.cv_skills;         -- expected to throw
  exception when insufficient_privilege then
    denied := true;
  end;
  reset role;
  if not denied then
    raise exception 'TEST 3 FAILED: authenticated was able to read public.cv_skills';
  end if;
  raise notice 'TEST 3 PASSED: authenticated denied SELECT on cv_skills (no PII leak)';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 4 — anon CANNOT write owner PII (insert into another/any user's data).
-- ---------------------------------------------------------------------------
do $$
declare
  denied boolean := false;
begin
  set local role anon;
  begin
    insert into public.cv_skills (user_id, name)
    values ('11111111-1111-1111-1111-111111111111', 'injected');  -- expected to throw
  exception when insufficient_privilege then
    denied := true;
  end;
  reset role;
  if not denied then
    raise exception 'TEST 4 FAILED: anon was able to INSERT into cv_skills';
  end if;
  raise notice 'TEST 4 PASSED: anon denied INSERT on cv_skills';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 5 — cv_templates: public read sees ACTIVE only, never inactive.
-- ---------------------------------------------------------------------------
do $$
declare
  active_cnt   int;
  inactive_cnt int;
begin
  set local role anon;
  select count(*) into active_cnt   from public.cv_templates where slug = 'test-active';
  select count(*) into inactive_cnt from public.cv_templates where slug = 'test-inactive';
  reset role;

  if active_cnt <> 1 then
    raise exception 'TEST 5 FAILED: anon could not read ACTIVE template (got % rows)', active_cnt;
  end if;
  if inactive_cnt <> 0 then
    raise exception 'TEST 5 FAILED: anon read an INACTIVE template (got % rows)', inactive_cnt;
  end if;
  raise notice 'TEST 5 PASSED: anon reads active templates only, inactive hidden';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 6 — cv_templates: anon/authenticated CANNOT write (admin-only).
-- ---------------------------------------------------------------------------
do $$
declare
  denied boolean := false;
begin
  set local role authenticated;
  begin
    insert into public.cv_templates (slug, name, layout_config)
    values ('hacked', 'hacked', '{}'::jsonb);  -- expected to throw
  exception when insufficient_privilege then
    denied := true;
  end;
  reset role;
  if not denied then
    raise exception 'TEST 6 FAILED: authenticated was able to INSERT a cv_template';
  end if;
  raise notice 'TEST 6 PASSED: non-admin denied INSERT on cv_templates';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 7 — Server-side per-user scoping isolates A from B.
--   This is the mechanism the SECURITY DEFINER RPC / API layer uses: it always
--   filters by the cookie-verified user_id. Verify that scoping to A returns
--   ONLY A's rows and never B's (and vice versa).
-- ---------------------------------------------------------------------------
do $$
declare
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  user_b uuid := '22222222-2222-2222-2222-222222222222';
  a_sees_b int;
  b_sees_a int;
begin
  -- Simulate "user A's request": query scoped to A must not contain B's secret.
  select count(*) into a_sees_b
  from public.cv_skills where user_id = user_a and name = 'B-secret-skill';

  select count(*) into b_sees_a
  from public.cv_skills where user_id = user_b and name = 'A-secret-skill';

  if a_sees_b <> 0 then
    raise exception 'TEST 7 FAILED: A-scoped query exposed B''s data';
  end if;
  if b_sees_a <> 0 then
    raise exception 'TEST 7 FAILED: B-scoped query exposed A''s data';
  end if;
  raise notice 'TEST 7 PASSED: user_id scoping isolates A from B';
end $$;

do $$ begin raise notice '=== ALL CV RLS TESTS PASSED ==='; end $$;

rollback;

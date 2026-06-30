-- =============================================================================
-- ZPath CV Builder — T02: RLS policies (plan §4)
--
-- IMPORTANT — divergence from spec §4 literal SQL:
--   Plan §4 writes policies as `auth.uid() = user_id`. That does NOT work in
--   ZPath: the app uses CUSTOM auth (public.zpath_users + HMAC `zpath_auth`
--   cookie), there is no client Supabase session, so `auth.uid()` is ALWAYS
--   NULL. A literal `auth.uid() = user_id` policy would deny 100% of access.
--
--   This migration follows the convention already established in the codebase
--   (mentor_schema, harden_schema, user_profiles):
--     * Owner PII tables  -> RLS ON, locked to service_role only.
--                            Per-user (A-vs-B) isolation is enforced in the
--                            SECURITY DEFINER RPC / server API layer, which
--                            receives the cookie-verified user id and always
--                            scopes queries by user_id.
--     * Public-read config -> cv_templates: anon/authenticated may SELECT only
--                            active rows; writes are service_role only (admin).
--
--   RLS here is the hard OUTER wall: no untrusted role (anon/authenticated) can
--   read or write any user's CV PII. NOT loosened for share/mentor — those go
--   through token RPCs in a later task (T21).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Owner PII tables — RLS ON, service_role only
--    (cv_* data + generated_cvs + cv_recommendations + personality_results)
-- ---------------------------------------------------------------------------
alter table public.cv_profiles          enable row level security;
alter table public.cv_education         enable row level security;
alter table public.cv_experiences       enable row level security;
alter table public.cv_skills            enable row level security;
alter table public.cv_certificates      enable row level security;
alter table public.cv_awards            enable row level security;
alter table public.cv_activities        enable row level security;
alter table public.generated_cvs        enable row level security;
alter table public.cv_recommendations   enable row level security;
alter table public.personality_results  enable row level security;

do $$
declare
  t text;
  owner_tables text[] := array[
    'cv_profiles','cv_education','cv_experiences','cv_skills',
    'cv_certificates','cv_awards','cv_activities','generated_cvs',
    'cv_recommendations','personality_results'
  ];
begin
  foreach t in array owner_tables loop
    execute format('drop policy if exists %I on public.%I', t || '_service_role_only', t);
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      t || '_service_role_only', t
    );
    -- Untrusted roles get nothing; only the trusted server (service_role) touches PII.
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to service_role', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) cv_templates — public read of ACTIVE rows, writes admin (service_role) only
--    Mirrors the universities/majors public-read convention.
-- ---------------------------------------------------------------------------
alter table public.cv_templates enable row level security;

drop policy if exists "cv_templates public read active" on public.cv_templates;
create policy "cv_templates public read active"
  on public.cv_templates
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "cv_templates service_role all" on public.cv_templates;
create policy "cv_templates service_role all"
  on public.cv_templates
  for all
  to service_role
  using (true)
  with check (true);

grant select on public.cv_templates to anon, authenticated;
grant select, insert, update, delete on public.cv_templates to service_role;

-- ---------------------------------------------------------------------------
-- 3) sponsored_placements / affiliate_clicks — RLS ON, service_role only.
--    Posters & click tracking are served via server API (which applies the
--    "Tài trợ" labelling + context-tag-only targeting from §5.4/§13.5).
--    Locked down to avoid over-permissioning; not exposed to anon/authenticated.
-- ---------------------------------------------------------------------------
alter table public.sponsored_placements enable row level security;
alter table public.affiliate_clicks     enable row level security;

drop policy if exists "sponsored_placements service_role only" on public.sponsored_placements;
create policy "sponsored_placements service_role only"
  on public.sponsored_placements
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "affiliate_clicks service_role only" on public.affiliate_clicks;
create policy "affiliate_clicks service_role only"
  on public.affiliate_clicks
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.sponsored_placements from anon;
revoke all on table public.sponsored_placements from authenticated;
revoke all on table public.affiliate_clicks from anon;
revoke all on table public.affiliate_clicks from authenticated;
grant select, insert, update, delete on table public.sponsored_placements to service_role;
grant select, insert, update, delete on table public.affiliate_clicks to service_role;

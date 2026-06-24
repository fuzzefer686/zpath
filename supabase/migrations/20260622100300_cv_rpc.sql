-- =============================================================================
-- ZPath CV Builder — T05: Core RPCs (plan §3 / §6)
--
--   * get_cv_document(user_id)        -> normalized CVDocument JSON (6 blocks),
--                                        certificate display names resolved from
--                                        the existing cert catalog.
--   * compute_completeness_score(uid) -> config-driven % (weights in ONE place),
--                                        persists cv_profiles.completeness_score.
--
-- Auth note (same as rest of ZPath): custom auth, auth.uid() always NULL.
-- These are SECURITY DEFINER, take the cookie-verified user id as an argument,
-- execute granted to service_role only (mentor-RPC convention).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) cv_section_weights() — SINGLE SOURCE OF TRUTH for completeness weights.
--    Change weights here only. Equal weight (neutral default); tune as needed.
--    Sections mirror cv_profiles.sections_config order.
-- ---------------------------------------------------------------------------
create or replace function public.cv_section_weights()
returns table (section text, weight numeric)
language sql
immutable
as $$
  values
    ('basic'::text,             1.0::numeric),
    ('summary',                 1.0),
    ('education',               1.0),
    ('experience_skills',       1.0),
    ('certs_awards',            1.0),
    ('activities',              1.0)
$$;

comment on function public.cv_section_weights() is
  'Single source of truth for CV completeness section weights (config over hardcoding).';

-- ---------------------------------------------------------------------------
-- 2) _cv_section_fill(user_id) — internal: which sections have data.
--    Shared by compute_completeness_score() and get_cv_document() so the
--    "has data" rule lives in one place.
-- ---------------------------------------------------------------------------
create or replace function public._cv_section_fill(p_user_id uuid)
returns table (section text, filled boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select 'basic'::text,
         exists (select 1 from public.cv_profiles p
                 where p.user_id = p_user_id and p.full_name is not null)
  union all
  select 'summary',
         exists (select 1 from public.cv_profiles p
                 where p.user_id = p_user_id
                   and (p.summary is not null or p.headline is not null))
  union all
  select 'education',
         exists (select 1 from public.cv_education e where e.user_id = p_user_id)
  union all
  select 'experience_skills',
         exists (select 1 from public.cv_experiences x where x.user_id = p_user_id)
      or exists (select 1 from public.cv_skills s where s.user_id = p_user_id)
  union all
  select 'certs_awards',
         exists (select 1 from public.cv_certificates c where c.user_id = p_user_id)
      or exists (select 1 from public.cv_awards a where a.user_id = p_user_id)
  union all
  select 'activities',
         exists (select 1 from public.cv_activities ac where ac.user_id = p_user_id);
$$;

-- ---------------------------------------------------------------------------
-- 3) compute_completeness_score(user_id) — config-driven %, persists to row.
--    Returns 0 when the profile has no filled sections (or no profile row).
-- ---------------------------------------------------------------------------
create or replace function public.compute_completeness_score(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_score int;
begin
  select coalesce(
           round(
             sum(w.weight) filter (where f.filled)
             / nullif(sum(w.weight), 0) * 100
           )::int,
           0)
    into v_score
  from public.cv_section_weights() w
  join public._cv_section_fill(p_user_id) f using (section);

  -- Persist onto the profile (kept in sync; column is RPC-computed per §3.1).
  update public.cv_profiles
     set completeness_score = v_score
   where user_id = p_user_id;

  return v_score;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) get_cv_document(user_id) — normalized CVDocument JSON (§6.2), read-only.
--    Certificates resolve their display name + catalog validity from the
--    existing public.language_certificate_conversions catalog (§3.5):
--      - inCatalog  : cert_type_code matches a real catalog certificate_type
--      - displayName : canonical catalog certificate_type (fallback = raw code)
--    Personality only included when the user opted in (include_in_cv, §5.5).
-- ---------------------------------------------------------------------------
create or replace function public.get_cv_document(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc jsonb;
begin
  select jsonb_build_object(
    'basic', coalesce((
      select jsonb_build_object(
        'fullName',  p.full_name,
        'dob',       p.date_of_birth,
        'gender',    p.gender,
        'phone',     p.phone,
        'email',     p.email,
        'address',   p.address,
        'avatarUrl', p.avatar_url
      ) from public.cv_profiles p where p.user_id = p_user_id
    ), '{}'::jsonb),

    'summary', coalesce((
      select jsonb_build_object(
        'headline',        p.headline,
        'objective',       p.summary,
        'targetMajorCode', p.target_major_code,
        'targetCareer',    p.target_career
      ) from public.cv_profiles p where p.user_id = p_user_id
    ), '{}'::jsonb),

    'education', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'level', e.level, 'schoolName', e.school_name,
        'schoolCode', e.school_code, 'gpa', e.gpa,
        'grade10', e.grade_10, 'grade11', e.grade_11, 'grade12', e.grade_12,
        'subjects', e.subjects, 'startYear', e.start_year, 'endYear', e.end_year,
        'isCurrent', e.is_current, 'linkedTranscriptId', e.linked_transcript_id
      ) order by e.is_current desc, e.end_year desc nulls last)
      from public.cv_education e where e.user_id = p_user_id
    ), '[]'::jsonb),

    'experiences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'type', x.type, 'title', x.title,
        'organization', x.organization, 'description', x.description,
        'startDate', x.start_date, 'endDate', x.end_date, 'isCurrent', x.is_current
      ) order by x.sort_order, x.start_date desc nulls last)
      from public.cv_experiences x where x.user_id = p_user_id
    ), '[]'::jsonb),

    'skills', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'category', s.category,
        'proficiency', s.proficiency, 'source', s.source, 'isConfirmed', s.is_confirmed
      ) order by s.category, s.name)
      from public.cv_skills s where s.user_id = p_user_id
    ), '[]'::jsonb),

    'certificates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'code', c.cert_type_code,
        'displayName', coalesce(cat.certificate_type, c.cert_type_code),
        'inCatalog', (cat.certificate_type is not null),
        'score', c.score,
        'issuedDate', c.issued_date,
        'expiryDate', c.expiry_date,
        'isVerified', c.is_verified
      ) order by c.issued_date desc nulls last)
      from public.cv_certificates c
      left join lateral (
        select lcc.certificate_type
        from public.language_certificate_conversions lcc
        where lcc.certificate_type = c.cert_type_code
        limit 1
      ) cat on true
      where c.user_id = p_user_id
    ), '[]'::jsonb),

    'awards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'title', a.title, 'level', a.level, 'rank', a.rank,
        'issuer', a.issuer, 'awardYear', a.award_year
      ) order by a.award_year desc nulls last)
      from public.cv_awards a where a.user_id = p_user_id
    ), '[]'::jsonb),

    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ac.id, 'title', ac.title, 'role', ac.role,
        'organization', ac.organization, 'description', ac.description,
        'startDate', ac.start_date, 'endDate', ac.end_date, 'hours', ac.hours
      ) order by ac.sort_order, ac.start_date desc nulls last)
      from public.cv_activities ac where ac.user_id = p_user_id
    ), '[]'::jsonb),

    'personality', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'testSlug', pr.test_slug, 'resultCode', pr.result_code,
        'scores', pr.scores, 'summary', pr.summary
      ) order by pr.taken_at desc)
      from public.personality_results pr
      where pr.user_id = p_user_id and pr.include_in_cv = true
    ), '[]'::jsonb),

    'sectionsConfig', coalesce((
      select p.sections_config from public.cv_profiles p where p.user_id = p_user_id
    ), '{}'::jsonb),

    'completeness', (
      select coalesce(round(
               sum(w.weight) filter (where f.filled)
               / nullif(sum(w.weight), 0) * 100)::int, 0)
      from public.cv_section_weights() w
      join public._cv_section_fill(p_user_id) f using (section)
    ),

    'meta', jsonb_build_object(
      'locale', 'vi',
      'generatedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  )
  into v_doc;

  return v_doc;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Grants — service_role only (no PUBLIC execute), mentor-RPC convention.
-- ---------------------------------------------------------------------------
revoke execute on function public.cv_section_weights() from public;
revoke execute on function public._cv_section_fill(uuid) from public;
revoke execute on function public.compute_completeness_score(uuid) from public;
revoke execute on function public.get_cv_document(uuid) from public;

grant execute on function public.cv_section_weights() to service_role;
grant execute on function public._cv_section_fill(uuid) to service_role;
grant execute on function public.compute_completeness_score(uuid) to service_role;
grant execute on function public.get_cv_document(uuid) to service_role;

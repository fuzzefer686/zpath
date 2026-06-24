-- =============================================================================
-- ZPath CV Builder — Phase 0: Schema (enums + tables + indexes)
-- §2 Decisions: react-pdf default, DB-driven templates, reuse cert/transcript
-- §3 Data model: 13 tables
--
-- Auth note: ZPath uses public.zpath_users (custom auth).
-- auth.uid() is always NULL here. All user_id FKs reference public.zpath_users.
-- RLS will be added in the next migration (T02).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------

-- §3.3 experience_type
create type public.experience_type as enum (
  'work',
  'volunteer',
  'project',
  'internship',
  'competition',
  'other'
);

-- §3.4 skill_category
create type public.skill_category as enum (
  'technical',
  'soft',
  'language',
  'tool',
  'other'
);

-- §3.6 award_level
create type public.award_level as enum (
  'school',
  'district',
  'province',
  'national',
  'international'
);

-- §3.8 cv_render_engine (react_pdf = default; external stays OFF)
create type public.cv_render_engine as enum (
  'react_pdf',
  'html_pdf',
  'external'
);

-- §3.10 reco_type
create type public.reco_type as enum (
  'skill_gap',
  'cert_gap',
  'course',
  'career_direction',
  'summary_suggestion'
);

-- ---------------------------------------------------------------------------
-- §3.1  cv_profiles — Basic info + Summary/Objective (blocks 1 & 2)
-- One row per user (PK = user_id).
-- sections_config is config-driven (order + visibility) — no hardcode.
-- ---------------------------------------------------------------------------
create table public.cv_profiles (
  user_id uuid primary key references public.zpath_users(id) on delete cascade,
  -- Basic info
  full_name        text,
  date_of_birth    date,
  gender           text,
  phone            text,
  email            text,
  address          text,
  avatar_url       text,
  -- Summary / objective
  headline         text,
  summary          text,
  target_major_code text,   -- links to UniMap
  target_career    text,
  -- Section display config (order + visibility, config-driven §2)
  sections_config  jsonb not null default '{
    "order": ["basic","summary","education","experience_skills","certs_awards","activities"],
    "visibility": {
      "basic": true,
      "summary": true,
      "education": true,
      "experience_skills": true,
      "certs_awards": true,
      "activities": true
    }
  }'::jsonb,
  -- Computed by RPC compute_completeness_score, never hardcoded
  completeness_score int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Reuse existing set_updated_at() trigger function
drop trigger if exists set_cv_profiles_updated_at on public.cv_profiles;
create trigger set_cv_profiles_updated_at
  before update on public.cv_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- §3.2  cv_education — Education / Transcript (block 3)
-- linked_transcript_id avoids duplicating data from the scoring system.
-- ---------------------------------------------------------------------------
create table public.cv_education (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.zpath_users(id) on delete cascade,
  level                text not null,          -- 'THPT', 'THCS', 'university'
  school_name          text not null,
  school_code          text,                   -- optional link to schools table
  gpa                  numeric(4,2),
  grade_10             numeric(4,2),
  grade_11             numeric(4,2),
  grade_12             numeric(4,2),
  subjects             jsonb,                  -- {"Toan":9.2,"Van":8.0,...}
  start_year           int,
  end_year             int,
  is_current           boolean not null default false,
  linked_transcript_id uuid,                   -- FK to existing transcript if imported
  created_at           timestamptz not null default now()
);
create index idx_cv_education_user on public.cv_education(user_id);

-- ---------------------------------------------------------------------------
-- §3.3  cv_experiences — Experience (half of block 4)
-- ---------------------------------------------------------------------------
create table public.cv_experiences (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.zpath_users(id) on delete cascade,
  type         public.experience_type not null default 'project',
  title        text not null,
  organization text,
  description  text,
  start_date   date,
  end_date     date,
  is_current   boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index idx_cv_experiences_user on public.cv_experiences(user_id, sort_order);

-- ---------------------------------------------------------------------------
-- §3.4  cv_skills — Skills (other half of block 4)
-- source: 'self' | 'verified' | 'ai_suggested'
-- AI-suggested rows start with is_confirmed=false until user accepts (§5.2).
-- ---------------------------------------------------------------------------
create table public.cv_skills (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.zpath_users(id) on delete cascade,
  name         text not null,
  category     public.skill_category not null default 'other',
  proficiency  int check (proficiency between 1 and 5),
  source       text not null default 'self',
  is_confirmed boolean not null default true,
  created_at   timestamptz not null default now()
);
create index idx_cv_skills_user on public.cv_skills(user_id);

-- ---------------------------------------------------------------------------
-- §3.5  cv_certificates — Certificates (block 5, REUSE cert catalog)
-- cert_type_code links to existing Language Certificate Conversion catalog.
-- Do NOT create a new cert catalog — reference the existing one.
-- evidence_url points to cv-evidence Storage bucket.
-- ---------------------------------------------------------------------------
create table public.cv_certificates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.zpath_users(id) on delete cascade,
  cert_type_code text not null,   -- FK-logic to catalog (IELTS/VSTEP/HSK/SAT...)
  score          text,            -- text to support band formats (e.g. "8.0", "C1")
  issued_date    date,
  expiry_date    date,
  evidence_url   text,
  is_verified    boolean not null default false,
  created_at     timestamptz not null default now()
);
create index idx_cv_certificates_user on public.cv_certificates(user_id);

-- ---------------------------------------------------------------------------
-- §3.6  cv_awards — Awards (block 5)
-- ---------------------------------------------------------------------------
create table public.cv_awards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.zpath_users(id) on delete cascade,
  title       text not null,
  level       public.award_level not null default 'school',
  rank        text,          -- 'Giải Nhất', 'Top 10'...
  issuer      text,
  award_year  int,
  evidence_url text,
  created_at  timestamptz not null default now()
);
create index idx_cv_awards_user on public.cv_awards(user_id);

-- ---------------------------------------------------------------------------
-- §3.7  cv_activities — Extracurricular (block 6)
-- ---------------------------------------------------------------------------
create table public.cv_activities (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.zpath_users(id) on delete cascade,
  title        text not null,
  role         text,
  organization text,
  description  text,
  start_date   date,
  end_date     date,
  hours        int,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index idx_cv_activities_user on public.cv_activities(user_id, sort_order);

-- ---------------------------------------------------------------------------
-- §3.8  cv_templates — CV templates (DB-driven, config over hardcoding)
-- engine: react_pdf (default), html_pdf, external (OFF by default — §1.4)
-- layout_config: colours, fonts, section order, density...
-- ---------------------------------------------------------------------------
create table public.cv_templates (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  name              text not null,
  engine            public.cv_render_engine not null default 'react_pdf',
  layout_config     jsonb not null,
  locale            text not null default 'vi',
  is_active         boolean not null default true,
  preview_image_url text,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- §3.9  generated_cvs — Exported CV files + snapshot
-- data_snapshot: full CVDocument at render time → reproducible (§6, §2)
-- share_token: public share link (null = private, default §13.4)
-- expires_at: for scheduled cleanup (cron, §6.3)
-- served_at / purge_at (ephemeral 30-min, §13.8) added in T11 migration.
-- ---------------------------------------------------------------------------
create table public.generated_cvs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.zpath_users(id) on delete cascade,
  template_id   uuid references public.cv_templates(id) on delete set null,
  storage_path  text not null,
  format        text not null default 'pdf',
  data_snapshot jsonb not null,
  share_token   text unique,
  is_public     boolean not null default false,
  version       int not null default 1,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz
);
create index idx_generated_cvs_user on public.generated_cvs(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- §3.10  cv_recommendations — AI output (gap, courses, direction, summary)
-- All AI output lands here as 'pending'; user must accept before it enters CV.
-- rationale is mandatory for AI explainability (§5.2).
-- ---------------------------------------------------------------------------
create table public.cv_recommendations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.zpath_users(id) on delete cascade,
  type         public.reco_type not null,
  payload      jsonb not null,
  rationale    text,
  source_model text,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'dismissed')),
  generated_at timestamptz not null default now()
);
create index idx_cv_reco_user on public.cv_recommendations(user_id, type, status);

-- ---------------------------------------------------------------------------
-- §3.11  personality_results — Personality test results
-- Section is EMPTY by default until user clicks "Làm bài trắc nghiệm".
-- include_in_cv: user explicitly opts in to show on CV (§5.5).
-- ---------------------------------------------------------------------------
create table public.personality_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.zpath_users(id) on delete cascade,
  test_slug   text not null,     -- 'mbti' | 'holland' | ... (catalog TBD)
  result_code text,              -- 'INTJ' | 'RIA'...
  scores      jsonb,
  summary     text,
  include_in_cv boolean not null default false,
  taken_at    timestamptz not null default now()
);
create index idx_personality_user on public.personality_results(user_id, taken_at desc);

-- ---------------------------------------------------------------------------
-- §3.12  sponsored_placements — Sponsored poster slots
-- MUST remain separate from AI recommendations (§5.4).
-- Target by context_tags ONLY — never by personal data of minors (§13.5).
-- ---------------------------------------------------------------------------
create table public.sponsored_placements (
  id              uuid primary key default gen_random_uuid(),
  sponsor_name    text not null,
  title           text not null,
  poster_url      text not null,
  target_url      text not null,
  discount_label  text,
  context_tags    text[],          -- ['it','ielts','design'] — general tags, NO PII
  commission_model text,           -- 'cpc' | 'cpa'
  is_active       boolean not null default true,
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- §3.12  affiliate_clicks — Click tracking for sponsored placements
-- user_id nullable to minimise PII collection (§13.5).
-- ---------------------------------------------------------------------------
create table public.affiliate_clicks (
  id            uuid primary key default gen_random_uuid(),
  placement_id  uuid not null references public.sponsored_placements(id) on delete cascade,
  user_id       uuid references public.zpath_users(id) on delete set null,
  clicked_at    timestamptz not null default now(),
  context       text    -- 'capability_map' | 'course_reco' ...
);
create index idx_affiliate_clicks_placement on public.affiliate_clicks(placement_id, clicked_at desc);

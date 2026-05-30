-- ============================================================================
-- Migration: Add email to zpath_users, create profiles table, create
-- user_survey_questions table, and set up avatars storage bucket.
-- ============================================================================

-- 1. Add email column to zpath_users
-- ---------------------------------------------------------------------------
ALTER TABLE public.zpath_users
  ADD COLUMN IF NOT EXISTS email text;

-- Postgres 17 does not allow adding a generated column with IF NOT EXISTS
-- after the table already exists, so we do it conditionally.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'zpath_users'
      AND column_name = 'email_normalized'
  ) THEN
    ALTER TABLE public.zpath_users
      ADD COLUMN email_normalized text GENERATED ALWAYS AS (lower(email)) STORED;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS zpath_users_email_normalized_key
  ON public.zpath_users (email_normalized)
  WHERE email_normalized IS NOT NULL;

-- 2. Create profiles table (user display info, avatar, bio, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES public.zpath_users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  bio text,
  school text,
  grade text,
  target_university text,
  sbti text,
  score_math numeric DEFAULT 0,
  score_literature numeric DEFAULT 0,
  elective_subject_1 text,
  elective_score_1 numeric DEFAULT 0,
  elective_subject_2 text,
  elective_score_2 numeric DEFAULT 0,
  ielts numeric DEFAULT 0,
  cultural_award text DEFAULT 'none',
  region text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Only service_role can access profiles (app manages access via JWT auth).
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.profiles FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- 3. Create user_survey_questions table
-- ---------------------------------------------------------------------------
-- Stores every question a user asks via the advisor/survey page so that the
-- AI team can analyse usage patterns and improve answer quality.
CREATE TABLE IF NOT EXISTS public.user_survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.zpath_users(id) ON DELETE CASCADE,
  anonymous_id text,
  question text NOT NULL,
  intent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_survey_questions_owner_present
    CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_user_survey_questions_user_id
  ON public.user_survey_questions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_survey_questions_anonymous_id
  ON public.user_survey_questions (anonymous_id, created_at DESC)
  WHERE anonymous_id IS NOT NULL;

ALTER TABLE public.user_survey_questions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_survey_questions FROM anon;
REVOKE ALL ON TABLE public.user_survey_questions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_survey_questions TO service_role;

-- 4. Avatars storage bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MiB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access for avatar images
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Only service_role can manage avatar files (upload/delete happens server-side)
CREATE POLICY "Service role manages avatars"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

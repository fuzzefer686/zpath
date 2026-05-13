CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  avatar text NOT NULL DEFAULT '',
  school text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  target_university text NOT NULL DEFAULT '',
  sbti text NOT NULL DEFAULT '',
  score_math numeric(4,2) NOT NULL DEFAULT 0,
  score_literature numeric(4,2) NOT NULL DEFAULT 0,
  elective_subject_1 text NOT NULL DEFAULT '',
  elective_score_1 numeric(4,2) NOT NULL DEFAULT 0,
  elective_subject_2 text NOT NULL DEFAULT '',
  elective_score_2 numeric(4,2) NOT NULL DEFAULT 0,
  ielts numeric(3,1) NOT NULL DEFAULT 0,
  cultural_award text NOT NULL DEFAULT 'none',
  region text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_score_math_range CHECK (score_math >= 0 AND score_math <= 10),
  CONSTRAINT profiles_score_literature_range CHECK (score_literature >= 0 AND score_literature <= 10),
  CONSTRAINT profiles_elective_score_1_range CHECK (elective_score_1 >= 0 AND elective_score_1 <= 10),
  CONSTRAINT profiles_elective_score_2_range CHECK (elective_score_2 >= 0 AND elective_score_2 <= 10),
  CONSTRAINT profiles_ielts_range CHECK (ielts >= 0 AND ielts <= 9),
  CONSTRAINT profiles_cultural_award_check CHECK (
    cultural_award IN ('none', 'encouragement', 'third', 'second', 'first')
  )
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

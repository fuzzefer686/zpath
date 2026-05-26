CREATE TABLE IF NOT EXISTS public.zpath_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  username_normalized text GENERATED ALWAYS AS (lower(username)) STORED,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT zpath_users_role_check CHECK (role IN ('user', 'admin')),
  CONSTRAINT zpath_users_username_format_check CHECK (
    username ~ '^[A-Za-z0-9_.-]{3,32}$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS zpath_users_username_normalized_key
  ON public.zpath_users (username_normalized);

CREATE TABLE IF NOT EXISTS public.user_survey_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.zpath_users(id) ON DELETE CASCADE,
  latest_survey_response_id uuid REFERENCES public.survey_responses(id) ON DELETE SET NULL,
  session_id text,
  normalized_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_survey_profiles_session_id
  ON public.user_survey_profiles (session_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_zpath_users_updated_at ON public.zpath_users;
CREATE TRIGGER set_zpath_users_updated_at
  BEFORE UPDATE ON public.zpath_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_survey_profiles_updated_at ON public.user_survey_profiles;
CREATE TRIGGER set_user_survey_profiles_updated_at
  BEFORE UPDATE ON public.user_survey_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.zpath_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_survey_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zpath_users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_survey_profiles TO service_role;

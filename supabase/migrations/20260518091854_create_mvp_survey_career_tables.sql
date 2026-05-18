CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'tally',
  provider_submission_id text,
  session_id text,
  provider_raw_payload jsonb NOT NULL,
  normalized_profile jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.career_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_response_id uuid REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  session_id text,
  career_rankings jsonb NOT NULL,
  student_summary jsonb,
  next_steps_30_days jsonb,
  ai_raw_output jsonb,
  model_name text,
  prompt_version text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_session_id
  ON public.survey_responses (session_id);

CREATE INDEX IF NOT EXISTS idx_career_evaluations_session_id
  ON public.career_evaluations (session_id);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_evaluations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_responses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_evaluations TO service_role;

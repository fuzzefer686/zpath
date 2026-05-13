CREATE OR REPLACE FUNCTION auth.set_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
BEGIN
  IF NEW.raw_app_meta_data IS NULL THEN
    NEW.raw_app_meta_data = '{"role": "user"}'::jsonb;
  ELSIF NOT (NEW.raw_app_meta_data ? 'role') THEN
    NEW.raw_app_meta_data = NEW.raw_app_meta_data || '{"role": "user"}'::jsonb;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_default_user_role_on_auth_users ON auth.users;
CREATE TRIGGER set_default_user_role_on_auth_users
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.set_default_user_role();

DO $$
DECLARE
  column_name text;
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'advisor_major_weights',
    'advisor_weight_contributions'
  ]
  LOOP
    FOREACH column_name IN ARRAY ARRAY[
      'math_weight',
      'literature_weight',
      'english_weight',
      'physics_weight',
      'chemistry_weight',
      'biology_weight',
      'history_weight',
      'geography_weight',
      'civic_education_weight',
      'informatics_weight',
      'technology_weight',
      'academic_fit_weight',
      'interest_fit_weight',
      'career_goal_fit_weight',
      'personality_fit_weight'
    ]
    LOOP
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I TYPE numeric(7,6) USING %I::numeric(7,6)',
        table_name,
        column_name,
        column_name
      );
    END LOOP;
  END LOOP;
END $$;

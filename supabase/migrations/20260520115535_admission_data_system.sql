CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  english_name text,
  type text,
  city text,
  address text,
  website text,
  fanpage text,
  description text,
  source_url text,
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admission_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL REFERENCES public.schools(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  method_code text NOT NULL,
  method_name text NOT NULL,
  year int NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  source_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT admission_methods_school_method_year_key UNIQUE (school_code, method_code, year)
);

CREATE TABLE IF NOT EXISTS public.admission_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL REFERENCES public.schools(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  program_code text,
  program_name text NOT NULL,
  major_code text,
  major_name text,
  year int NOT NULL,
  quota int,
  degree_level text DEFAULT 'Đại học',
  training_type text,
  note text,
  source_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT admission_programs_school_program_year_key UNIQUE (school_code, program_code, year)
);

CREATE TABLE IF NOT EXISTS public.subject_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  subjects text[] NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS public.program_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES public.admission_programs(id) ON DELETE CASCADE,
  combination_code text NOT NULL,
  year int NOT NULL,
  method_code text,
  source_url text,
  CONSTRAINT program_combinations_program_combination_year_method_key UNIQUE (
    program_id,
    combination_code,
    year,
    method_code
  )
);

CREATE TABLE IF NOT EXISTS public.benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL REFERENCES public.schools(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  program_id uuid REFERENCES public.admission_programs(id) ON DELETE CASCADE,
  year int NOT NULL,
  method_code text NOT NULL,
  combination_code text,
  score numeric NOT NULL,
  scale int DEFAULT 30,
  note text,
  source_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tuition_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL REFERENCES public.schools(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  program_id uuid REFERENCES public.admission_programs(id) ON DELETE SET NULL,
  year int NOT NULL,
  min_fee numeric,
  max_fee numeric,
  currency text DEFAULT 'VND',
  unit text,
  description text,
  note text,
  source_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admission_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL REFERENCES public.schools(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  year int NOT NULL,
  total_quota int,
  admission_scope text,
  application_timeline text,
  eligibility text,
  notes text,
  source_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT admission_info_school_year_key UNIQUE (school_code, year)
);

CREATE TABLE IF NOT EXISTS public.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  school_code text REFERENCES public.schools(code) ON UPDATE CASCADE ON DELETE SET NULL,
  source_name text,
  source_url text NOT NULL,
  source_type text,
  verified_status text DEFAULT 'unverified',
  last_checked_at timestamptz,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_slug
  ON public.schools (slug);

CREATE INDEX IF NOT EXISTS idx_schools_code
  ON public.schools (code);

CREATE INDEX IF NOT EXISTS idx_admission_methods_school_code
  ON public.admission_methods (school_code);

CREATE INDEX IF NOT EXISTS idx_admission_methods_year
  ON public.admission_methods (year);

CREATE INDEX IF NOT EXISTS idx_admission_methods_school_year
  ON public.admission_methods (school_code, year);

CREATE INDEX IF NOT EXISTS idx_admission_programs_school_code
  ON public.admission_programs (school_code);

CREATE INDEX IF NOT EXISTS idx_admission_programs_year
  ON public.admission_programs (year);

CREATE INDEX IF NOT EXISTS idx_admission_programs_school_year
  ON public.admission_programs (school_code, year);

CREATE INDEX IF NOT EXISTS idx_admission_programs_major_code
  ON public.admission_programs (major_code);

CREATE INDEX IF NOT EXISTS idx_subject_combinations_code
  ON public.subject_combinations (code);

CREATE INDEX IF NOT EXISTS idx_program_combinations_program_id
  ON public.program_combinations (program_id);

CREATE INDEX IF NOT EXISTS idx_program_combinations_year
  ON public.program_combinations (year);

CREATE INDEX IF NOT EXISTS idx_program_combinations_combination_code
  ON public.program_combinations (combination_code);

CREATE INDEX IF NOT EXISTS idx_benchmarks_school_code
  ON public.benchmarks (school_code);

CREATE INDEX IF NOT EXISTS idx_benchmarks_program_id
  ON public.benchmarks (program_id);

CREATE INDEX IF NOT EXISTS idx_benchmarks_year
  ON public.benchmarks (year);

CREATE INDEX IF NOT EXISTS idx_benchmarks_lookup
  ON public.benchmarks (school_code, year, method_code, combination_code);

CREATE INDEX IF NOT EXISTS idx_tuition_fees_school_code
  ON public.tuition_fees (school_code);

CREATE INDEX IF NOT EXISTS idx_tuition_fees_program_id
  ON public.tuition_fees (program_id);

CREATE INDEX IF NOT EXISTS idx_tuition_fees_year
  ON public.tuition_fees (year);

CREATE INDEX IF NOT EXISTS idx_admission_info_school_code
  ON public.admission_info (school_code);

CREATE INDEX IF NOT EXISTS idx_admission_info_year
  ON public.admission_info (year);

CREATE INDEX IF NOT EXISTS idx_data_sources_school_code
  ON public.data_sources (school_code);

CREATE INDEX IF NOT EXISTS idx_data_sources_entity
  ON public.data_sources (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_data_sources_verified_status
  ON public.data_sources (verified_status);

CREATE TRIGGER set_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admission schools are publicly readable"
  ON public.schools
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admission methods are publicly readable"
  ON public.admission_methods
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admission programs are publicly readable"
  ON public.admission_programs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Subject combinations are publicly readable"
  ON public.subject_combinations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Program combinations are publicly readable"
  ON public.program_combinations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Benchmarks are publicly readable"
  ON public.benchmarks
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Tuition fees are publicly readable"
  ON public.tuition_fees
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admission info is publicly readable"
  ON public.admission_info
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Data sources are publicly readable"
  ON public.data_sources
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.schools TO anon, authenticated;
GRANT SELECT ON public.admission_methods TO anon, authenticated;
GRANT SELECT ON public.admission_programs TO anon, authenticated;
GRANT SELECT ON public.subject_combinations TO anon, authenticated;
GRANT SELECT ON public.program_combinations TO anon, authenticated;
GRANT SELECT ON public.benchmarks TO anon, authenticated;
GRANT SELECT ON public.tuition_fees TO anon, authenticated;
GRANT SELECT ON public.admission_info TO anon, authenticated;
GRANT SELECT ON public.data_sources TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_methods TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_programs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_combinations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_combinations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benchmarks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tuition_fees TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_info TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_sources TO service_role;

-- ============================================================================
-- Migration: Ensure infrastructure for PDF-driven admission config generation.
--
-- Safe to apply on production even if 20260609120000_admission_configs was
-- never run: every step is idempotent (IF NOT EXISTS / ON CONFLICT / DROP IF).
-- Includes set_updated_at() so this migration does not depend on earlier files
-- having been replayed in a specific order on a partially migrated database.
-- ============================================================================

-- 0. updated_at helper (used by admission_configs trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. admission_configs table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admission_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL,
  school_name text NOT NULL,
  year int NOT NULL CHECK (year >= 2000 AND year <= 2100),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
  config jsonb NOT NULL,
  source_pdf_url text,
  source_pdf_path text,
  version int NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by text,
  reviewed_by text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admission_configs_lookup_idx
  ON public.admission_configs (school_code, year, status);

CREATE INDEX IF NOT EXISTS admission_configs_status_idx
  ON public.admission_configs (status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS admission_configs_one_published_per_year
  ON public.admission_configs (school_code, year)
  WHERE status = 'published';

DROP TRIGGER IF EXISTS set_admission_configs_updated_at ON public.admission_configs;
CREATE TRIGGER set_admission_configs_updated_at
  BEFORE UPDATE ON public.admission_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.admission_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published admission configs are publicly readable"
  ON public.admission_configs;
CREATE POLICY "Published admission configs are publicly readable"
  ON public.admission_configs
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

REVOKE ALL ON TABLE public.admission_configs FROM anon;
REVOKE ALL ON TABLE public.admission_configs FROM authenticated;
GRANT SELECT ON public.admission_configs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_configs TO service_role;

-- 2. admission-pdfs storage bucket (private; source PDF documents)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'admission-pdfs',
  'admission-pdfs',
  false,
  20971520,  -- 20 MiB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Service role manages admission pdfs" ON storage.objects;
CREATE POLICY "Service role manages admission pdfs"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'admission-pdfs')
  WITH CHECK (bucket_id = 'admission-pdfs');

-- Major Profiles Knowledge Table
-- Stores structured knowledge about university majors for the ZPath advisor.
-- Replaces the flat JSON files in the /knowledge folder.
-- profile_data (jsonb) holds the full MajorProfile; key scalar fields are
-- promoted to real columns so they can be filtered/indexed on the DB side.

CREATE TABLE IF NOT EXISTS public.major_profiles (
    major_id        text PRIMARY KEY,
    canonical_name  text NOT NULL,
    category        text NOT NULL,
    status          text NOT NULL DEFAULT 'approved',
    scope           text NOT NULL DEFAULT 'country_specific',
    version         integer NOT NULL DEFAULT 1,
    aliases         text[] NOT NULL DEFAULT '{}',
    tags            text[] NOT NULL DEFAULT '{}',
    search_keywords text[] NOT NULL DEFAULT '{}',
    profile_data    jsonb NOT NULL,
    last_updated    timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_major_profiles_category
    ON public.major_profiles(category);

CREATE INDEX IF NOT EXISTS idx_major_profiles_status
    ON public.major_profiles(status);

CREATE INDEX IF NOT EXISTS idx_major_profiles_aliases
    ON public.major_profiles USING GIN(aliases);

CREATE INDEX IF NOT EXISTS idx_major_profiles_search_keywords
    ON public.major_profiles USING GIN(search_keywords);

-- RLS: anyone can read approved profiles, only service_role can write
ALTER TABLE public.major_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "major_profiles_public_read"
    ON public.major_profiles
    FOR SELECT
    USING (status = 'approved');

GRANT SELECT ON public.major_profiles TO anon, authenticated;
GRANT ALL    ON public.major_profiles TO service_role;

-- Auto-update updated_at on every row update
CREATE OR REPLACE FUNCTION public.set_major_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_major_profiles_updated_at
    BEFORE UPDATE ON public.major_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_major_profiles_updated_at();

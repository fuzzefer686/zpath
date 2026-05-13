CREATE TABLE IF NOT EXISTS public.majors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    category text,
    description text,
    tags text[]
);

-- Nullify any major_code that doesn't exist in majors yet
UPDATE public.programs SET major_code = NULL WHERE major_code IS NOT NULL AND major_code NOT IN (SELECT code FROM public.majors);

ALTER TABLE public.programs ADD CONSTRAINT programs_major_code_fkey FOREIGN KEY (major_code) REFERENCES public.majors(code) ON DELETE SET NULL;

ALTER TABLE public.majors DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS hero_image_url text;

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS hero_image_url text;

-- Add student-friendly display fields to schools.
--
-- Students recognize popular abbreviations (PTIT, DAV, UEH, HCMUS) far better
-- than the internal registration code (BVH, VKA, DBS) or the long official
-- name. `short_name` holds the popular abbreviation shown prominently in the
-- UI; `aliases` holds other common names students may search by.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS short_name text,
  ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.schools.short_name IS
  'Popular abbreviation shown prominently in UI (e.g. PTIT, DAV, UEH). Falls back to code when null.';
COMMENT ON COLUMN public.schools.aliases IS
  'Other common names/abbreviations students search by (e.g. {HCMUS, "Tự nhiên HCM"}).';

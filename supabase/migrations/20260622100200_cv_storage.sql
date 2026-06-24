-- =============================================================================
-- ZPath CV Builder — T03: Storage buckets + policies (plan §4 Storage)
--
-- Two PRIVATE buckets:
--   * cv-exports  : rendered CV files (PDF). Ephemeral (purged per §13.8 in T12).
--   * cv-evidence : certificate / award proof scans (image/pdf).
--
-- Path convention: {user_id}/{cv_id}/{filename}
--
-- Auth note (same as the rest of ZPath): custom auth, `auth.uid()` is ALWAYS
-- NULL, so spec §4's `auth.uid() = prefix` storage policy cannot work. Following
-- the established mentor-storage convention:
--   * Buckets are private + locked to service_role only. anon/authenticated have
--     NO access at all — there are no public URLs.
--   * Uploads and downloads are mediated by server API routes using the
--     service_role key. Before issuing an upload target or a short-TTL signed
--     URL, the server checks that the cookie-verified user_id owns the path
--     prefix via public.cv_storage_owns_path() below. That is the point where
--     "user A cannot touch user B's file" is enforced — and it is testable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Buckets (private). MIME whitelist + size cap enforced at the bucket level
--    too (defense-in-depth; the API also validates app-side).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-exports',
  'cv-exports',
  false,
  10485760, -- 10 MB
  array['application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-evidence',
  'cv-evidence',
  false,
  10485760, -- 10 MB
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2) storage.objects policies — service_role only for both buckets.
--    No anon/authenticated policy => those roles are denied by default.
-- ---------------------------------------------------------------------------
drop policy if exists "Service role manages cv-exports" on storage.objects;
create policy "Service role manages cv-exports"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'cv-exports')
  with check (bucket_id = 'cv-exports');

drop policy if exists "Service role manages cv-evidence" on storage.objects;
create policy "Service role manages cv-evidence"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'cv-evidence')
  with check (bucket_id = 'cv-evidence');

-- ---------------------------------------------------------------------------
-- 3) Canonical owner-prefix guard.
--    Single source of truth for "does this user own this object path?".
--    The server API MUST call this (or mirror it) before any upload/sign.
--    Rule: the first path segment must equal the user_id.
--      e.g. cv_storage_owns_path('<A>', '<A>/<cv>/file.pdf') -> true
--           cv_storage_owns_path('<A>', '<B>/<cv>/file.pdf') -> false
-- ---------------------------------------------------------------------------
create or replace function public.cv_storage_owns_path(
  p_user_id uuid,
  p_object_name text
)
returns boolean
language sql
immutable
as $$
  select (storage.foldername(p_object_name))[1] = p_user_id::text;
$$;

comment on function public.cv_storage_owns_path(uuid, text) is
  'Owner-prefix guard for cv-exports/cv-evidence: true iff the first path '
  'segment equals user_id. Server API calls this before issuing upload '
  'targets or signed URLs so user A cannot reach user B''s files by path.';

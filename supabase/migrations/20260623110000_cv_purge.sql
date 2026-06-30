-- =============================================================================
-- ZPath CV Builder — T12: ephemeral purge RPCs (plan §13.8)
--
-- HARD-delete only. No soft-delete, no tombstone — once purged, no trace.
--
-- These RPCs delete the DB rows (the authoritative record). Storage FILE removal
-- goes through the Storage API (SQL cannot reliably delete the S3 binary — it
-- would only orphan the storage.objects metadata). The callers do files-first:
--   1. SELECT due/owned storage paths
--   2. storage.remove(paths)        (Storage API — reliable, idempotent)
--   3. call the RPC below to delete the rows
-- so a crash between steps leaves a re-purgeable row, never an orphaned file.
--
-- Auth: ZPath custom auth → auth.uid() is NULL. SECURITY DEFINER, take the
-- cookie-verified user id as an argument, execute granted to service_role only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- purge_cv_now(user_id) — manual "Xoá ngay": hard-delete a user's exported CV
-- rows. Returns the storage paths deleted so the caller removes the files.
-- ---------------------------------------------------------------------------
create or replace function public.purge_cv_now(p_user_id uuid)
returns setof text
language sql
security definer
set search_path = public
as $$
  delete from public.generated_cvs
  where user_id = p_user_id
  returning storage_path;
$$;

comment on function public.purge_cv_now(uuid) is
  'Hard-delete a user''s generated_cvs rows (ephemeral §13.8). Returns deleted '
  'storage paths; caller must storage.remove() them. service_role only.';

-- ---------------------------------------------------------------------------
-- purge_expired_cvs() — background sweep: hard-delete every row past its
-- purge_at. Returns the deleted storage paths. Pure-SQL fallback for pg_cron;
-- the purge-cv Edge Function does files-first ordering for the primary path.
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_cvs()
returns setof text
language sql
security definer
set search_path = public
as $$
  delete from public.generated_cvs
  where purge_at <= now()
  returning storage_path;
$$;

comment on function public.purge_expired_cvs() is
  'Hard-delete all generated_cvs rows with purge_at <= now() (ephemeral §13.8). '
  'Returns deleted storage paths. service_role only.';

-- ---------------------------------------------------------------------------
-- Lock down execution to service_role (mediated by server routes / Edge Fn).
-- ---------------------------------------------------------------------------
revoke all on function public.purge_cv_now(uuid) from public, anon, authenticated;
revoke all on function public.purge_expired_cvs() from public, anon, authenticated;
grant execute on function public.purge_cv_now(uuid) to service_role;
grant execute on function public.purge_expired_cvs() to service_role;

-- =============================================================================
-- ZPath CV Builder — T22 follow-up: cv_rate_limit_logs retention cleanup.
--
-- The rate-limit table is append-only (one row per render / AI call) and the
-- enforcement window is just 1 hour — rows older than that are dead weight.
-- Without cleanup the table grows unbounded and the count() queries slow down.
--
-- This adds:
--   * a created_at index for an efficient time-based delete,
--   * purge_old_rate_limit_logs(interval) — hard-deletes rows past a retention
--     window (default 24h: generous margin over the 1h enforcement window).
--
-- The existing per-minute purge-cv Edge Function calls this each run, so no new
-- cron is required. SECURITY DEFINER, service_role only (purge convention).
-- =============================================================================

-- Time-based delete support (the existing index is user_id-prefixed and does
-- not help a global created_at < cutoff scan).
create index if not exists idx_cv_rate_limit_logs_created
  on public.cv_rate_limit_logs(created_at);

create or replace function public.purge_old_rate_limit_logs(
  p_older_than interval default interval '24 hours'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from public.cv_rate_limit_logs
  where created_at < now() - p_older_than;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.purge_old_rate_limit_logs(interval) is
  'Hard-delete cv_rate_limit_logs rows older than the retention window '
  '(default 24h). Called by the purge-cv Edge Function each run. service_role only.';

revoke all on function public.purge_old_rate_limit_logs(interval)
  from public, anon, authenticated;
grant execute on function public.purge_old_rate_limit_logs(interval) to service_role;

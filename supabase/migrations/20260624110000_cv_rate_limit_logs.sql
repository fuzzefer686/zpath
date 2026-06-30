-- =============================================================================
-- ZPath CV Builder — T22: Rate Limiting Logs table
--
-- Tracks renders and AI calls to enforce resource/compliance boundaries (10/hr).
-- Follows standard ZPath convention: RLS ON, locked to service_role only.
-- =============================================================================

create table if not exists public.cv_rate_limit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.zpath_users(id) on delete cascade,
  action_type text not null, -- 'render' or 'ai_call'
  created_at timestamptz not null default now()
);

create index if not exists idx_cv_rate_limit_logs_user_action 
  on public.cv_rate_limit_logs(user_id, action_type, created_at desc);

alter table public.cv_rate_limit_logs enable row level security;

drop policy if exists "cv_rate_limit_logs service_role only" on public.cv_rate_limit_logs;
create policy "cv_rate_limit_logs service_role only"
  on public.cv_rate_limit_logs
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.cv_rate_limit_logs from anon;
revoke all on table public.cv_rate_limit_logs from authenticated;
grant select, insert, update, delete on table public.cv_rate_limit_logs to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zpath-ai-exam-images',
  'zpath-ai-exam-images',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Service role manages Zpath AI exam images" on storage.objects;
create policy "Service role manages Zpath AI exam images"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'zpath-ai-exam-images')
  with check (bucket_id = 'zpath-ai-exam-images');

create table if not exists public.zpath_ai_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid null references public.advisor_conversations(id) on delete set null,
  user_id uuid null references public.zpath_users(id) on delete set null,
  anonymous_id text null,
  storage_bucket text not null default 'zpath-ai-exam-images',
  storage_path text not null,
  file_name text not null,
  file_mime_type text not null,
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  extracted_markdown text not null default '',
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'reviewing' check (status in ('reviewing', 'confirmed')),
  current_question_index integer not null default 0 check (current_question_index >= 0),
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zpath_ai_exam_sessions_owner_present
    check (user_id is not null or anonymous_id is not null)
);

create table if not exists public.zpath_ai_exam_solution_runs (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null references public.zpath_ai_exam_sessions(id) on delete cascade,
  run_index integer not null check (run_index between 1 and 3),
  mode text not null check (mode in ('single_question', 'next_question', 'full_exam', 'verification')),
  user_prompt text null,
  question_index integer null check (question_index is null or question_index >= 0),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  progress_label text null,
  answer_markdown text null,
  error_message text null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists zpath_ai_exam_sessions_user_id_idx
  on public.zpath_ai_exam_sessions (user_id, updated_at desc);

create index if not exists zpath_ai_exam_sessions_anonymous_id_idx
  on public.zpath_ai_exam_sessions (anonymous_id, updated_at desc)
  where anonymous_id is not null;

create index if not exists zpath_ai_exam_solution_runs_session_idx
  on public.zpath_ai_exam_solution_runs (exam_session_id, created_at);

drop trigger if exists set_zpath_ai_exam_sessions_updated_at on public.zpath_ai_exam_sessions;
create trigger set_zpath_ai_exam_sessions_updated_at
  before update on public.zpath_ai_exam_sessions
  for each row
  execute function public.set_updated_at();

alter table public.zpath_ai_exam_sessions enable row level security;
alter table public.zpath_ai_exam_solution_runs enable row level security;

drop policy if exists "Zpath AI exam sessions are service-role only" on public.zpath_ai_exam_sessions;
create policy "Zpath AI exam sessions are service-role only"
  on public.zpath_ai_exam_sessions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Zpath AI exam solution runs are service-role only" on public.zpath_ai_exam_solution_runs;
create policy "Zpath AI exam solution runs are service-role only"
  on public.zpath_ai_exam_solution_runs
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.zpath_ai_exam_sessions from anon;
revoke all on table public.zpath_ai_exam_sessions from authenticated;
revoke all on table public.zpath_ai_exam_solution_runs from anon;
revoke all on table public.zpath_ai_exam_solution_runs from authenticated;

grant select, insert, update, delete on public.zpath_ai_exam_sessions to service_role;
grant select, insert, update, delete on public.zpath_ai_exam_solution_runs to service_role;

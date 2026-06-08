create table if not exists public.zpath_ai_exam_session_images (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null references public.zpath_ai_exam_sessions(id) on delete cascade,
  page_index integer not null check (page_index >= 0 and page_index < 5),
  storage_bucket text not null default 'zpath-ai-exam-images',
  storage_path text not null,
  file_name text not null,
  file_mime_type text not null check (file_mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  created_at timestamptz not null default now(),
  unique (exam_session_id, page_index),
  unique (storage_bucket, storage_path)
);

create index if not exists zpath_ai_exam_session_images_session_idx
  on public.zpath_ai_exam_session_images (exam_session_id, page_index);

alter table public.zpath_ai_exam_session_images enable row level security;

drop policy if exists "Zpath AI exam session images are service-role only"
  on public.zpath_ai_exam_session_images;
create policy "Zpath AI exam session images are service-role only"
  on public.zpath_ai_exam_session_images
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.zpath_ai_exam_session_images from anon;
revoke all on table public.zpath_ai_exam_session_images from authenticated;

grant select, insert, update, delete on public.zpath_ai_exam_session_images to service_role;

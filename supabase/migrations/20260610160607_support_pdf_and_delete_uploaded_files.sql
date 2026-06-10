update storage.buckets
set
  file_size_limit = 20971520,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
where id = 'zpath-ai-exam-images';

alter table public.zpath_ai_exam_sessions
  drop constraint if exists zpath_ai_exam_sessions_file_size_bytes_check;

alter table public.zpath_ai_exam_sessions
  add constraint zpath_ai_exam_sessions_file_size_bytes_check
  check (file_size_bytes > 0 and file_size_bytes <= 20971520);

alter table public.zpath_ai_exam_session_images
  drop constraint if exists zpath_ai_exam_session_images_file_mime_type_check;

alter table public.zpath_ai_exam_session_images
  add constraint zpath_ai_exam_session_images_file_mime_type_check
  check (file_mime_type in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf'));

alter table public.zpath_ai_exam_session_images
  drop constraint if exists zpath_ai_exam_session_images_file_size_bytes_check;

alter table public.zpath_ai_exam_session_images
  add constraint zpath_ai_exam_session_images_file_size_bytes_check
  check (file_size_bytes > 0 and file_size_bytes <= 20971520);

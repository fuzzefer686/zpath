-- Mentor consultation feature: chat attachments storage (Phase 1).
--
-- Private bucket. Path convention: {conversation_id}/{message_id}/{filename}
-- Uploads and signed-URL downloads are mediated by server API routes using the
-- service_role key (consistent with the rest of ZPath's storage model), so the
-- bucket is locked to service_role only — anon/authenticated have no access.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mentor-chat-attachments',
  'mentor-chat-attachments',
  false,
  26214400, -- 25 MB hard cap (images are validated to a lower limit app-side)
  array[
    -- Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Service role manages mentor chat attachments" on storage.objects;
create policy "Service role manages mentor chat attachments"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'mentor-chat-attachments')
  with check (bucket_id = 'mentor-chat-attachments');

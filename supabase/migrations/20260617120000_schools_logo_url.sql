-- School logos for the UniMap directory: a logo column on `schools` plus a
-- public Storage bucket to hold the actual image files (downloaded by the
-- pipeline so we don't hotlink fragile third-party URLs).

alter table public.schools
  add column if not exists logo_url text;

comment on column public.schools.logo_url is
  'Public URL of the school logo (Supabase Storage school-logos bucket). Shown on UniMap cards and the detail hero.';

-- Public bucket: logos are non-sensitive branding assets shown to all visitors.
-- Writes are done by the pipeline with the service_role key; reads are public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-logos',
  'school-logos',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read school logos" on storage.objects;
create policy "Public read school logos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'school-logos');

drop policy if exists "Service role manages school logos" on storage.objects;
create policy "Service role manages school logos"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'school-logos')
  with check (bucket_id = 'school-logos');

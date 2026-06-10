insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-images',
  'exam-images',
  true,
  20971520,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Exam images are publicly accessible" on storage.objects;
create policy "Exam images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'exam-images');

drop policy if exists "Service role manages exam images" on storage.objects;
create policy "Service role manages exam images"
  on storage.objects for all
  to service_role
  using (bucket_id = 'exam-images')
  with check (bucket_id = 'exam-images');

create table if not exists public.exam_images (
  id uuid primary key default gen_random_uuid(),
  route_slug text not null,
  subject text not null,
  document_type text not null default 'de',
  storage_path text not null unique,
  public_url text not null,
  mime_type text not null,
  file_size integer not null,
  uploaded_by uuid references public.zpath_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.exam_images
  add column if not exists document_type text not null default 'de';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exam_images_document_type_check'
      and conrelid = 'public.exam_images'::regclass
  ) then
    alter table public.exam_images
      add constraint exam_images_document_type_check
      check (document_type in ('de', 'dap_an'));
  end if;
end $$;

create index if not exists idx_exam_images_route_created
  on public.exam_images(route_slug, created_at desc);

create index if not exists idx_exam_images_lookup
  on public.exam_images(route_slug, subject, document_type, created_at desc);

create index if not exists idx_exam_images_subject
  on public.exam_images(subject);

alter table public.exam_images enable row level security;

drop policy if exists "Exam images metadata is publicly readable" on public.exam_images;
create policy "Exam images metadata is publicly readable"
  on public.exam_images
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Service role manages exam images metadata" on public.exam_images;
create policy "Service role manages exam images metadata"
  on public.exam_images
  for all
  to service_role
  using (true)
  with check (true);

grant select on public.exam_images to anon;
grant select on public.exam_images to authenticated;
grant all on public.exam_images to service_role;

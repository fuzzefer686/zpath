alter table public.news_articles
  add column if not exists owner_id uuid references public.zpath_users(id) on delete set null,
  add column if not exists content_markdown text,
  add column if not exists cover_image_url text,
  add column if not exists status text not null default 'published',
  add column if not exists moderation_note text,
  add column if not exists reviewed_by uuid references public.zpath_users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

update public.news_articles
set
  content_markdown = coalesce(content_markdown, content),
  status = case when published then 'published' else 'draft' end
where content_markdown is null
   or status is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'news_articles_status_check'
      and conrelid = 'public.news_articles'::regclass
  ) then
    alter table public.news_articles
      add constraint news_articles_status_check
      check (status in ('draft', 'published', 'pending_review', 'rejected'));
  end if;
end $$;

create index if not exists idx_news_articles_owner_created
  on public.news_articles(owner_id, created_at desc);

create index if not exists idx_news_articles_status_created
  on public.news_articles(status, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'news-images',
  'news-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "News images are publicly accessible" on storage.objects;
create policy "News images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'news-images');

drop policy if exists "Service role manages news images" on storage.objects;
create policy "Service role manages news images"
  on storage.objects for all
  to service_role
  using (bucket_id = 'news-images')
  with check (bucket_id = 'news-images');

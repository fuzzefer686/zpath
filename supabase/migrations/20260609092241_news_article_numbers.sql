alter table public.news_articles
  add column if not exists article_number integer;

with numbered_articles as (
  select
    id,
    row_number() over (order by created_at asc, id asc)::integer as generated_number
  from public.news_articles
  where article_number is null
)
update public.news_articles as articles
set article_number = numbered_articles.generated_number
from numbered_articles
where articles.id = numbered_articles.id;

create sequence if not exists public.news_article_number_seq
  as integer
  minvalue 1
  maxvalue 99999
  start with 1
  increment by 1
  no cycle;

select setval(
  'public.news_article_number_seq',
  greatest((select coalesce(max(article_number), 1) from public.news_articles), 1),
  true
);

alter table public.news_articles
  alter column article_number set default nextval('public.news_article_number_seq');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'news_articles_article_number_range_check'
      and conrelid = 'public.news_articles'::regclass
  ) then
    alter table public.news_articles
      add constraint news_articles_article_number_range_check
      check (article_number between 1 and 99999);
  end if;
end $$;

create unique index if not exists news_articles_article_number_key
  on public.news_articles(article_number)
  where article_number is not null;

create index if not exists idx_news_articles_article_number_published
  on public.news_articles(article_number, published, status);

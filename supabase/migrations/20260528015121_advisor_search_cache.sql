create table if not exists public.advisor_search_cache (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  normalized_query text not null,
  provider text not null,
  results jsonb not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

create unique index if not exists advisor_search_cache_provider_query_key
  on public.advisor_search_cache (provider, normalized_query);

create index if not exists advisor_search_cache_expires_at_idx
  on public.advisor_search_cache (expires_at);

alter table public.advisor_search_cache enable row level security;

drop policy if exists "Advisor search cache is service-role only" on public.advisor_search_cache;
create policy "Advisor search cache is service-role only"
  on public.advisor_search_cache
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.advisor_search_cache from anon;
revoke all on table public.advisor_search_cache from authenticated;
grant select, insert, update, delete on public.advisor_search_cache to service_role;

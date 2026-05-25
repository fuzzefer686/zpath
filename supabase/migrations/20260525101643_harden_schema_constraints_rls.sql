-- Harden public schema constraints and Supabase RLS posture.
-- This migration avoids deleting existing data. Some constraints are added as
-- NOT VALID so they protect new writes while leaving legacy rows for cleanup.

-- Fix Supabase advisor warnings for trigger functions in the exposed schema.
do $$
begin
  if to_regprocedure('public.update_updated_at_column()') is not null then
    alter function public.update_updated_at_column() set search_path = public, pg_temp;
  end if;

  if to_regprocedure('public.set_updated_at()') is not null then
    alter function public.set_updated_at() set search_path = public, pg_temp;
  end if;
end $$;

-- Legacy public content tables: keep reads public, require privileged writes.
alter table if exists public.universities enable row level security;
alter table if exists public.majors enable row level security;
alter table if exists public.programs enable row level security;

drop policy if exists "Universities are publicly readable" on public.universities;
create policy "Universities are publicly readable"
  on public.universities
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Majors are publicly readable" on public.majors;
create policy "Majors are publicly readable"
  on public.majors
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Programs are publicly readable" on public.programs;
create policy "Programs are publicly readable"
  on public.programs
  for select
  to anon, authenticated
  using (true);

grant select on public.universities to anon, authenticated;
grant select on public.majors to anon, authenticated;
grant select on public.programs to anon, authenticated;
grant select, insert, update, delete on public.universities to service_role;
grant select, insert, update, delete on public.majors to service_role;
grant select, insert, update, delete on public.programs to service_role;

-- Legacy assessment table contained broad anon/auth grants. Lock it to service_role.
alter table if exists public.user_profiles enable row level security;
revoke all on table public.user_profiles from anon;
revoke all on table public.user_profiles from authenticated;
grant select, insert, update, delete on public.user_profiles to service_role;

-- News policies: reduce duplicate permissive SELECT policies and avoid per-row auth.jwt() initplans.
drop policy if exists "Anyone can read published articles" on public.news_articles;
drop policy if exists "Admin can read all articles" on public.news_articles;
drop policy if exists "Admin can insert articles" on public.news_articles;
drop policy if exists "Admin can update articles" on public.news_articles;
drop policy if exists "Admin can delete articles" on public.news_articles;

create policy "Articles are readable when published or admin"
  on public.news_articles
  for select
  to anon, authenticated
  using (
    published = true
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Admins can insert articles"
  on public.news_articles
  for insert
  to authenticated
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update articles"
  on public.news_articles
  for update
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete articles"
  on public.news_articles
  for delete
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- Structural checks for future rows. They are NOT VALID to avoid blocking on legacy cleanup.
alter table if exists public.admission_programs
  drop constraint if exists admission_programs_program_code_present,
  add constraint admission_programs_program_code_present
    check (program_code is not null and btrim(program_code) <> '') not valid;

alter table if exists public.program_combinations
  drop constraint if exists program_combinations_program_id_present,
  add constraint program_combinations_program_id_present
    check (program_id is not null) not valid;

alter table if exists public.benchmarks
  drop constraint if exists benchmarks_program_id_present,
  add constraint benchmarks_program_id_present
    check (program_id is not null) not valid;

alter table if exists public.career_evaluations
  drop constraint if exists career_evaluations_survey_response_id_present,
  add constraint career_evaluations_survey_response_id_present
    check (survey_response_id is not null) not valid;

alter table if exists public.data_sources
  drop constraint if exists data_sources_verified_status_check,
  add constraint data_sources_verified_status_check
    check (verified_status in ('unverified', 'partially_verified', 'verified', 'placeholder')) not valid;

-- Foreign keys missing from the original admission model.
alter table if exists public.program_combinations
  drop constraint if exists program_combinations_combination_code_fkey,
  add constraint program_combinations_combination_code_fkey
    foreign key (combination_code)
    references public.subject_combinations(code)
    on update cascade
    on delete restrict
    not valid;

alter table if exists public.benchmarks
  drop constraint if exists benchmarks_combination_code_fkey,
  add constraint benchmarks_combination_code_fkey
    foreign key (combination_code)
    references public.subject_combinations(code)
    on update cascade
    on delete restrict
    not valid;

alter table if exists public.benchmarks
  drop constraint if exists benchmarks_school_method_year_fkey,
  add constraint benchmarks_school_method_year_fkey
    foreign key (school_code, method_code, year)
    references public.admission_methods(school_code, method_code, year)
    on update cascade
    on delete restrict
    not valid;

-- Extra unique constraints where a composite FK needs a referenced key.
do $$
begin
  if to_regclass('public.admission_programs') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'admission_programs_id_school_year_key'
         and conrelid = 'public.admission_programs'::regclass
     ) then
    alter table public.admission_programs
      add constraint admission_programs_id_school_year_key unique (id, school_code, year);
  end if;
end $$;

alter table if exists public.benchmarks
  drop constraint if exists benchmarks_program_school_year_fkey,
  add constraint benchmarks_program_school_year_fkey
    foreign key (program_id, school_code, year)
    references public.admission_programs(id, school_code, year)
    on update cascade
    on delete cascade
    not valid;

alter table if exists public.tuition_fees
  drop constraint if exists tuition_fees_program_school_year_fkey,
  add constraint tuition_fees_program_school_year_fkey
    foreign key (program_id, school_code, year)
    references public.admission_programs(id, school_code, year)
    on update cascade
    on delete set null (program_id)
    not valid;

-- Guard invariants that cannot be expressed cleanly as plain FKs in the current shape.
create or replace function public.validate_program_combination_integrity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  program_record record;
begin
  select school_code, year
    into program_record
  from public.admission_programs
  where id = new.program_id;

  if not found then
    raise exception 'program_combinations.program_id % does not exist', new.program_id;
  end if;

  if new.method_code is not null and not exists (
    select 1
    from public.admission_methods
    where school_code = program_record.school_code
      and year = program_record.year
      and method_code = new.method_code
  ) then
    raise exception 'program_combinations method % is not valid for program %', new.method_code, new.program_id;
  end if;

  return new;
end;
$$;

create or replace function public.validate_benchmark_integrity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  program_record record;
begin
  select school_code, year
    into program_record
  from public.admission_programs
  where id = new.program_id;

  if not found then
    raise exception 'benchmarks.program_id % does not exist', new.program_id;
  end if;

  if program_record.school_code <> new.school_code or program_record.year <> new.year then
    raise exception 'benchmark program %, school %, year % are inconsistent', new.program_id, new.school_code, new.year;
  end if;

  return new;
end;
$$;

create or replace function public.validate_tuition_fee_integrity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  program_record record;
begin
  if new.program_id is null then
    return new;
  end if;

  select school_code, year
    into program_record
  from public.admission_programs
  where id = new.program_id;

  if not found then
    raise exception 'tuition_fees.program_id % does not exist', new.program_id;
  end if;

  if program_record.school_code <> new.school_code or program_record.year <> new.year then
    raise exception 'tuition fee program %, school %, year % are inconsistent', new.program_id, new.school_code, new.year;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_program_combination_integrity on public.program_combinations;
create trigger validate_program_combination_integrity
  before insert or update on public.program_combinations
  for each row
  execute function public.validate_program_combination_integrity();

drop trigger if exists validate_benchmark_integrity on public.benchmarks;
create trigger validate_benchmark_integrity
  before insert or update on public.benchmarks
  for each row
  execute function public.validate_benchmark_integrity();

drop trigger if exists validate_tuition_fee_integrity on public.tuition_fees;
create trigger validate_tuition_fee_integrity
  before insert or update on public.tuition_fees
  for each row
  execute function public.validate_tuition_fee_integrity();

-- Idempotency/duplicate protection. These are skipped if legacy duplicates already exist.
do $$
begin
  if to_regclass('public.survey_responses') is not null
     and to_regclass('public.survey_responses_provider_submission_unique_idx') is null then
    if not exists (
      select 1
      from public.survey_responses
      where provider_submission_id is not null
      group by provider, provider_submission_id
      having count(*) > 1
    ) then
      create unique index survey_responses_provider_submission_unique_idx
        on public.survey_responses (provider, provider_submission_id)
        where provider_submission_id is not null;
    else
      raise notice 'Skipped survey_responses provider submission unique index because duplicates exist.';
    end if;
  end if;

  if to_regclass('public.benchmarks') is not null
     and to_regclass('public.benchmarks_program_method_combination_unique_idx') is null then
    if not exists (
      select 1
      from public.benchmarks
      where program_id is not null
      group by program_id, year, method_code, combination_code
      having count(*) > 1
    ) then
      create unique index benchmarks_program_method_combination_unique_idx
        on public.benchmarks (program_id, year, method_code, combination_code) nulls not distinct
        where program_id is not null;
    else
      raise notice 'Skipped benchmarks unique index because duplicates exist.';
    end if;
  end if;

  if to_regclass('public.tuition_fees') is not null
     and to_regclass('public.tuition_fees_program_year_unit_unique_idx') is null then
    if not exists (
      select 1
      from public.tuition_fees
      where program_id is not null
      group by program_id, year, unit
      having count(*) > 1
    ) then
      create unique index tuition_fees_program_year_unit_unique_idx
        on public.tuition_fees (program_id, year, unit) nulls not distinct
        where program_id is not null;
    else
      raise notice 'Skipped tuition_fees unique index because duplicates exist.';
    end if;
  end if;

  if to_regclass('public.data_sources') is not null
     and to_regclass('public.data_sources_entity_source_unique_idx') is null then
    if not exists (
      select 1
      from public.data_sources
      group by entity_type, entity_id, school_code, source_url
      having count(*) > 1
    ) then
      create unique index data_sources_entity_source_unique_idx
        on public.data_sources (entity_type, entity_id, school_code, source_url) nulls not distinct;
    else
      raise notice 'Skipped data_sources unique index because duplicates exist.';
    end if;
  end if;
end $$;

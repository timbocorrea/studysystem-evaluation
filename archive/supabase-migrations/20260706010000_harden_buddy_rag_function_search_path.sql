-- STUDYSYSTEM-2026
-- CICLO BUDDY 1B — hardening de search_path em funções RAG/helpers
-- Não altera lógica de autorização; apenas fixa search_path seguro.

set check_function_bodies = off;

create or replace function public.can_access_lesson_embedding(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = p_lesson_id
        and (
          public.is_master_definer()
          or c.instructor_id = auth.uid()
          or exists (
            select 1
            from public.instructor_lesson_assignments ila
            where ila.lesson_id = l.id
              and ila.user_id = auth.uid()
          )
          or exists (
            select 1
            from public.course_enrollments ce
            where ce.course_id = m.course_id
              and ce.user_id = auth.uid()
              and ce.is_active = true
          )
        )
    );
$function$;

create or replace function public.has_course_assignment(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.instructor_lesson_assignments ila
    join public.lessons l on l.id = ila.lesson_id
    join public.modules m on m.id = l.module_id
    where m.course_id = p_course_id
      and ila.user_id = auth.uid()
  );
$function$;

create or replace function public.has_module_access(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.modules m
    join public.courses c on c.id = m.course_id
    where m.id = p_module_id
      and c.instructor_id = auth.uid()
  )
  or exists (
    select 1
    from public.instructor_lesson_assignments ila
    join public.lessons l on l.id = ila.lesson_id
    where l.module_id = p_module_id
      and ila.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.modules m
    join public.course_enrollments ce on ce.course_id = m.course_id
    where m.id = p_module_id
      and ce.user_id = auth.uid()
      and ce.is_active = true
  );
$function$;

create or replace function public.is_course_enrolled(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.course_enrollments
    where course_id = p_course_id
      and user_id = auth.uid()
      and is_active = true
  );
$function$;

create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = 'INSTRUCTOR' or email = '[REDACTED_EVALUATION_IDENTITY]')
  );
$function$;

create or replace function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = 'MASTER' or email = '[REDACTED_EVALUATION_IDENTITY]')
  );
$function$;

create or replace function public.is_master_definer()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select (auth.jwt() ->> 'role') = 'MASTER'
      or (auth.jwt() ->> 'email') = '[REDACTED_EVALUATION_IDENTITY]'
      or exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'MASTER'
      );
$function$;

create or replace function public.match_lesson_content(
  query_embedding vector,
  match_threshold double precision,
  match_count integer,
  p_lesson_id uuid default null::uuid,
  p_course_id uuid default null::uuid
)
returns table (
  id uuid,
  lesson_id uuid,
  content text,
  similarity double precision,
  metadata jsonb
)
language plpgsql
stable
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    le.id,
    le.lesson_id,
    le.content,
    1 - (le.embedding <=> query_embedding) as similarity,
    le.metadata
  from public.lesson_embeddings le
  join public.lessons l on l.id = le.lesson_id
  join public.modules m on m.id = l.module_id
  where (1 - (le.embedding <=> query_embedding) > match_threshold)
    and (p_lesson_id is null or le.lesson_id = p_lesson_id)
    and (p_course_id is null or m.course_id = p_course_id)
    and public.can_access_lesson_embedding(le.lesson_id)
  order by le.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 10);
end;
$function$;

notify pgrst, 'reload schema';

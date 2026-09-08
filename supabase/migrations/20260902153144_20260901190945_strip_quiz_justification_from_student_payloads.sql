-- STUDYSYSTEM-2026
-- FASE B1 - Remove justificativas/gabarito textual dos payloads de estudante.
--
-- A justificativa permanece no conteudo persistido para uso autorizado de
-- gestao/editorial, mas nao deve atravessar as RPCs de leitura do estudante.

begin;

create or replace function public.get_lesson_quiz_for_student(
  p_lesson_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_course_id uuid;
  v_is_allowed boolean := false;
  v_result json;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select m.course_id
    into v_course_id
  from public.lessons l
  join public.modules m
    on m.id = l.module_id
  where l.id = p_lesson_id
    and coalesce(l.is_active, true) = true
  limit 1;

  if v_course_id is null then
    return null;
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and upper(coalesce(p.role::text, '')) in ('MASTER', 'ADMIN', 'INSTRUCTOR')
  )
  or exists (
    select 1
    from public.courses c
    where c.id = v_course_id
      and c.instructor_id = v_user_id
  )
  or exists (
    select 1
    from public.course_enrollments ce
    where ce.course_id = v_course_id
      and ce.user_id = v_user_id
      and ce.is_active = true
  )
  or exists (
    select 1
    from public.courses c
    where c.id = v_course_id
      and coalesce(c.is_public, false) = true
  )
  or exists (
    select 1
    from public.lessons l
    where l.id = p_lesson_id
      and coalesce(l.is_public, false) = true
      and coalesce(l.is_active, true) = true
  )
  into v_is_allowed;

  if not coalesce(v_is_allowed, false) then
    raise exception 'Access denied';
  end if;

  select json_build_object(
    'id', q.id,
    'lesson_id', q.lesson_id,
    'title', q.title,
    'description', q.description,
    'passing_score', q.passing_score,
    'is_manually_released', coalesce(q.is_manually_released, false),
    'questions_count', q.questions_count,
    'pool_difficulty', q.pool_difficulty,
    'quiz_questions', coalesce((
      select json_agg(
        json_build_object(
          'id', qq.id,
          'quiz_id', qq.quiz_id,
          'question_text', btrim(
            regexp_replace(
              qq.question_text,
              E'\\s*\\*+Justificativa:\\*+.*$',
              '',
              'is'
            )
          ),
          'question_type', qq.question_type,
          'position', qq.position,
          'points', qq.points,
          'quiz_options', coalesce((
            select json_agg(
              json_build_object(
                'id', qo.id,
                'question_id', qo.question_id,
                'option_text', qo.option_text,
                'position', qo.position
              )
              order by qo.position
            )
            from public.quiz_options qo
            where qo.question_id = qq.id
          ), '[]'::json)
        )
        order by qq.position
      )
      from public.quiz_questions qq
      where qq.quiz_id = q.id
    ), '[]'::json)
  )
  into v_result
  from public.quizzes q
  where q.lesson_id = p_lesson_id
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.get_lesson_quiz_for_student(uuid) from public;
revoke all on function public.get_lesson_quiz_for_student(uuid) from anon;
revoke all on function public.get_lesson_quiz_for_student(uuid) from authenticated;

grant execute on function public.get_lesson_quiz_for_student(uuid) to authenticated;

create or replace function public.get_random_bank_questions_for_student(
  p_count integer,
  p_course_id uuid default null::uuid,
  p_module_id uuid default null::uuid,
  p_lesson_id uuid default null::uuid,
  p_difficulty text default null::text,
  p_exclude_ids uuid[] default null::uuid[]
)
returns setof json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_course_id uuid;
  v_is_allowed boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_course_id is not null then
    v_course_id := p_course_id;
  elsif p_lesson_id is not null then
    select m.course_id
      into v_course_id
    from public.lessons l
    join public.modules m
      on m.id = l.module_id
    where l.id = p_lesson_id
    limit 1;
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and upper(coalesce(p.role::text, '')) in ('MASTER', 'ADMIN', 'INSTRUCTOR')
  )
  or (
    v_course_id is not null
    and (
      exists (
        select 1
        from public.courses c
        where c.id = v_course_id
          and c.instructor_id = v_user_id
      )
      or exists (
        select 1
        from public.course_enrollments ce
        where ce.course_id = v_course_id
          and ce.user_id = v_user_id
          and ce.is_active = true
      )
      or exists (
        select 1
        from public.courses c
        where c.id = v_course_id
          and coalesce(c.is_public, false) = true
      )
    )
  )
  or (
    p_lesson_id is not null
    and exists (
      select 1
      from public.lessons l
      where l.id = p_lesson_id
        and coalesce(l.is_public, false) = true
        and coalesce(l.is_active, true) = true
    )
  )
  into v_is_allowed;

  if not coalesce(v_is_allowed, false) then
    raise exception 'Access denied';
  end if;

  return query
  with filtered_questions as (
    select q.*
    from public.question_bank q
    where (p_course_id is null or q.course_id = p_course_id)
      and (p_module_id is null or q.module_id = p_module_id)
      and (p_lesson_id is null or q.lesson_id = p_lesson_id)
      and (p_difficulty is null or q.difficulty = p_difficulty)
      and coalesce(q.status, 'active') = 'active'
      and (
        p_exclude_ids is null
        or array_length(p_exclude_ids, 1) is null
        or q.id <> all (p_exclude_ids)
      )
    order by random()
    limit greatest(0, least(coalesce(p_count, 0), 200))
  )
  select row_to_json(q_data)
  from (
    select
      fq.id,
      btrim(
        regexp_replace(
          fq.question_text,
          E'\\s*\\*+Justificativa:\\*+.*$',
          '',
          'is'
        )
      ) as question_text,
      fq.image_url,
      fq.image_alt,
      fq.difficulty,
      fq.points,
      fq.course_id,
      fq.module_id,
      fq.lesson_id,
      fq.created_at,
      fq.status,
      coalesce(
        (
          select json_agg(json_build_object(
            'id', opt.id,
            'question_id', opt.question_id,
            'option_text', opt.option_text,
            'position', opt.position,
            'is_correct', false
          ))
          from (
            select id, question_id, option_text, position
            from public.question_bank_options
            where question_id = fq.id
            order by position
          ) opt
        ),
        '[]'::json
      ) as question_bank_options
    from filtered_questions fq
  ) q_data;
end;
$$;

revoke all on function public.get_random_bank_questions_for_student(integer, uuid, uuid, uuid, text, uuid[]) from public;
revoke all on function public.get_random_bank_questions_for_student(integer, uuid, uuid, uuid, text, uuid[]) from anon;
grant execute on function public.get_random_bank_questions_for_student(integer, uuid, uuid, uuid, text, uuid[]) to authenticated;

notify pgrst, 'reload schema';

commit;

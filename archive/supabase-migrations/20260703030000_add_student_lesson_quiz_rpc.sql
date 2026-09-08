-- STUDYSYSTEM-2026
-- FASE 14K-2 - RPC segura para leitura de quiz de aula por aluno
--
-- Contexto:
-- - Diagnostico confirmou que o fluxo atual de aluno usa quizRepository.getQuizByLessonId(),
--   que carrega public.quiz_options.is_correct no cliente.
-- - public.submit_quiz_attempt ja calcula a tentativa server-side.
-- - Ainda falta um endpoint/RPC de leitura que entregue o quiz sem gabarito.
--
-- Escopo desta migration:
-- - Cria public.get_lesson_quiz_for_student(p_lesson_id uuid).
-- - Retorna quiz, perguntas e alternativas sem quiz_options.is_correct.
-- - Aplica controle de acesso por usuario autenticado, aula ativa, matricula ativa,
--   conteudo publico ou perfil staff.
-- - Usa SECURITY DEFINER com search_path seguro.
-- - Revoga EXECUTE de public/anon e concede apenas para authenticated.
-- - Nao altera tabelas.
-- - Nao altera dados.
-- - Nao altera RLS/policies.
-- - Nao altera Storage.
-- - Nao altera frontend.

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
          'question_text', qq.question_text,
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

notify pgrst, 'reload schema';

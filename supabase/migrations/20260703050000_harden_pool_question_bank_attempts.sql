-- STUDYSYSTEM-2026
-- FASE 14K-5 — Correção server-side completa de tentativas de banco de questões/pool
--
-- Contexto:
-- - Permite que a RPC submit_quiz_attempt avalie respostas de pool (question_bank)
--   quando o quiz não possui perguntas estáticas em quiz_questions.
-- - Cria check_pool_quiz_answers_for_student para o modo prática sem gravação de log/XP.
--
-- Controles:
-- - SECURITY DEFINER e search_path = public, pg_temp.
-- - Revoga EXECUTE de anon/public e concede apenas a authenticated.

create or replace function public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_passing_score numeric;
  v_total_points numeric := 0;
  v_earned_points numeric := 0;
  v_score_percent numeric;
  v_passed boolean;
  v_attempt_num integer;
  v_result json;
  q record;
  r record;
  v_option_id uuid;
  v_is_correct boolean;
  v_points numeric;
  v_has_static_questions boolean;
  
  -- Para validação de pool
  v_lesson_id uuid;
  v_course_id uuid;
  v_module_id uuid;
  v_questions_count integer;
  v_answers_count integer;
  v_available_questions integer;
  v_expected_count integer;
  v_q_id uuid;
  v_opt_id uuid;
  v_q_points numeric;
  v_q_course_id uuid;
  v_q_lesson_id uuid;
  v_q_module_id uuid;
  v_is_allowed boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Obter dados do quiz
  select lesson_id, course_id, module_id, questions_count, passing_score
    into v_lesson_id, v_course_id, v_module_id, v_questions_count, v_passing_score
  from public.quizzes
  where id = p_quiz_id;

  if v_passing_score is null then
    raise exception 'Quiz not found';
  end if;

  -- Determinar se é quiz tradicional ou pool
  select exists (
    select 1
    from public.quiz_questions
    where quiz_id = p_quiz_id
  ) into v_has_static_questions;

  if v_has_static_questions then
    -- ============ FLUXO TRADICIONAL ============
    for q in
      select id, points
      from public.quiz_questions
      where quiz_id = p_quiz_id
    loop
      v_points := coalesce(q.points, 10);
      v_total_points := v_total_points + v_points;

      if p_answers ? q.id::text then
        v_option_id := (p_answers ->> q.id::text)::uuid;

        select qo.is_correct
          into v_is_correct
        from public.quiz_options qo
        where qo.id = v_option_id
          and qo.question_id = q.id;

        if coalesce(v_is_correct, false) then
          v_earned_points := v_earned_points + v_points;
        end if;
      end if;
    end loop;
  else
    -- ============ FLUXO POOL / DYNAMIC BANK ============
    -- Validar p_answers formato
    if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
      raise exception 'Answers must be a JSON object';
    end if;

    -- Contar número de respostas
    select count(*)
      into v_answers_count
    from jsonb_object_keys(p_answers);

    if v_answers_count = 0 then
      raise exception 'Answers cannot be empty';
    end if;

    -- Limite máximo arbitrário de segurança
    if v_answers_count > 200 then
      raise exception 'Too many answers. Maximum is 200';
    end if;

    -- Validar permissão de acesso ao conteúdo
    if v_course_id is null and v_lesson_id is not null then
      select m.course_id
        into v_course_id
      from public.lessons l
      join public.modules m
        on m.id = l.module_id
      where l.id = v_lesson_id
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
      v_lesson_id is not null
      and exists (
        select 1
        from public.lessons l
        where l.id = v_lesson_id
          and coalesce(l.is_public, false) = true
          and coalesce(l.is_active, true) = true
      )
    )
    into v_is_allowed;

    if not coalesce(v_is_allowed, false) then
      raise exception 'Access denied to this quiz content';
    end if;

    -- Obter total de questões ativas disponíveis no banco para este escopo
    select count(*)
      into v_available_questions
    from public.question_bank q
    where (v_course_id is null or q.course_id = v_course_id)
      and (v_module_id is null or q.module_id = v_module_id)
      and (v_lesson_id is null or q.lesson_id = v_lesson_id)
      and coalesce(q.status, 'active') = 'active';

    v_expected_count := coalesce(v_questions_count, 20);
    if v_available_questions < v_expected_count then
      v_expected_count := v_available_questions;
    end if;

    -- A quantidade de respostas enviada não pode exceder o esperado
    if v_answers_count > v_expected_count then
      raise exception 'Too many answers submitted. Expected at most %, got %', v_expected_count, v_answers_count;
    end if;

    -- Corrigir cada resposta enviada
    for r in
      select key as question_id_str, value as option_id_str
      from jsonb_each_text(p_answers)
    loop
      v_q_id := r.question_id_str::uuid;
      v_opt_id := r.option_id_str::uuid;

      select q.points, q.course_id, q.lesson_id, q.module_id
        into v_q_points, v_q_course_id, v_q_lesson_id, v_q_module_id
      from public.question_bank q
      where q.id = v_q_id
        and coalesce(q.status, 'active') = 'active';

      if not found then
        raise exception 'Question % not found or inactive', v_q_id;
      end if;

      -- Verificar se a questão pertence ao escopo do quiz/aula/curso
      if (v_course_id is not null and v_q_course_id <> v_course_id) or
         (v_lesson_id is not null and v_q_lesson_id <> v_lesson_id) or
         (v_module_id is not null and v_q_module_id <> v_module_id) then
        raise exception 'Question % does not belong to the scope of this quiz', v_q_id;
      end if;

      v_points := coalesce(v_q_points, 10);
      v_total_points := v_total_points + v_points;

      select qo.is_correct
        into v_is_correct
      from public.question_bank_options qo
      where qo.id = v_opt_id
        and qo.question_id = v_q_id;

      if not found then
        raise exception 'Option % does not belong to question %', v_opt_id, v_q_id;
      end if;

      if coalesce(v_is_correct, false) then
        v_earned_points := v_earned_points + v_points;
      end if;
    end loop;
  end if;

  if v_total_points > 0 then
    v_score_percent := round((v_earned_points / v_total_points) * 100, 2);
  else
    v_score_percent := 0;
  end if;

  v_passed := v_score_percent >= v_passing_score;

  select count(*) + 1
    into v_attempt_num
  from public.quiz_attempts
  where user_id = v_user_id
    and quiz_id = p_quiz_id;

  insert into public.quiz_attempts (
    user_id,
    quiz_id,
    score,
    passed,
    answers,
    attempt_number,
    completed_at
  )
  values (
    v_user_id,
    p_quiz_id,
    v_score_percent,
    v_passed,
    p_answers,
    v_attempt_num,
    now()
  )
  returning row_to_json(quiz_attempts.*)
    into v_result;

  return v_result;
end;
$$;

create or replace function public.check_pool_quiz_answers_for_student(
  p_quiz_id uuid,
  p_answers jsonb
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_passing_score numeric;
  v_total_points numeric := 0;
  v_earned_points numeric := 0;
  v_score_percent numeric;
  v_passed boolean;
  q record;
  r record;
  v_option_id uuid;
  v_is_correct boolean;
  v_points numeric;
  v_has_static_questions boolean;
  
  -- Para validação de pool
  v_lesson_id uuid;
  v_course_id uuid;
  v_module_id uuid;
  v_questions_count integer;
  v_answers_count integer;
  v_available_questions integer;
  v_expected_count integer;
  v_q_id uuid;
  v_opt_id uuid;
  v_q_points numeric;
  v_q_course_id uuid;
  v_q_lesson_id uuid;
  v_q_module_id uuid;
  v_is_allowed boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Obter dados do quiz
  select lesson_id, course_id, module_id, questions_count, passing_score
    into v_lesson_id, v_course_id, v_module_id, v_questions_count, v_passing_score
  from public.quizzes
  where id = p_quiz_id;

  if v_passing_score is null then
    raise exception 'Quiz not found';
  end if;

  -- Determinar se é quiz tradicional ou pool
  select exists (
    select 1
    from public.quiz_questions
    where quiz_id = p_quiz_id
  ) into v_has_static_questions;

  if v_has_static_questions then
    -- ============ FLUXO TRADICIONAL (PRÁTICA) ============
    for q in
      select id, points
      from public.quiz_questions
      where quiz_id = p_quiz_id
    loop
      v_points := coalesce(q.points, 10);
      v_total_points := v_total_points + v_points;

      if p_answers ? q.id::text then
        v_option_id := (p_answers ->> q.id::text)::uuid;

        select qo.is_correct
          into v_is_correct
        from public.quiz_options qo
        where qo.id = v_option_id
          and qo.question_id = q.id;

        if coalesce(v_is_correct, false) then
          v_earned_points := v_earned_points + v_points;
        end if;
      end if;
    end loop;
  else
    -- ============ FLUXO POOL / DYNAMIC BANK (PRÁTICA) ============
    -- Validar p_answers formato
    if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
      raise exception 'Answers must be a JSON object';
    end if;

    -- Contar número de respostas
    select count(*)
      into v_answers_count
    from jsonb_object_keys(p_answers);

    if v_answers_count = 0 then
      raise exception 'Answers cannot be empty';
    end if;

    -- Limite máximo arbitrário de segurança
    if v_answers_count > 200 then
      raise exception 'Too many answers. Maximum is 200';
    end if;

    -- Validar permissão de acesso ao conteúdo
    if v_course_id is null and v_lesson_id is not null then
      select m.course_id
        into v_course_id
      from public.lessons l
      join public.modules m
        on m.id = l.module_id
      where l.id = v_lesson_id
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
      v_lesson_id is not null
      and exists (
        select 1
        from public.lessons l
        where l.id = v_lesson_id
          and coalesce(l.is_public, false) = true
          and coalesce(l.is_active, true) = true
      )
    )
    into v_is_allowed;

    if not coalesce(v_is_allowed, false) then
      raise exception 'Access denied to this quiz content';
    end if;

    -- Obter total de questões ativas disponíveis no banco para este escopo
    select count(*)
      into v_available_questions
    from public.question_bank q
    where (v_course_id is null or q.course_id = v_course_id)
      and (v_module_id is null or q.module_id = v_module_id)
      and (v_lesson_id is null or q.lesson_id = v_lesson_id)
      and coalesce(q.status, 'active') = 'active';

    v_expected_count := coalesce(v_questions_count, 20);
    if v_available_questions < v_expected_count then
      v_expected_count := v_available_questions;
    end if;

    -- A quantidade de respostas enviada não pode exceder o esperado
    if v_answers_count > v_expected_count then
      raise exception 'Too many answers submitted. Expected at most %, got %', v_expected_count, v_answers_count;
    end if;

    -- Corrigir cada resposta enviada
    for r in
      select key as question_id_str, value as option_id_str
      from jsonb_each_text(p_answers)
    loop
      v_q_id := r.question_id_str::uuid;
      v_opt_id := r.option_id_str::uuid;

      select q.points, q.course_id, q.lesson_id, q.module_id
        into v_q_points, v_q_course_id, v_q_lesson_id, v_q_module_id
      from public.question_bank q
      where q.id = v_q_id
        and coalesce(q.status, 'active') = 'active';

      if not found then
        raise exception 'Question % not found or inactive', v_q_id;
      end if;

      -- Verificar se a questão pertence ao escopo do quiz/aula/curso
      if (v_course_id is not null and v_q_course_id <> v_course_id) or
         (v_lesson_id is not null and v_q_lesson_id <> v_lesson_id) or
         (v_module_id is not null and v_q_module_id <> v_module_id) then
        raise exception 'Question % does not belong to the scope of this quiz', v_q_id;
      end if;

      v_points := coalesce(v_q_points, 10);
      v_total_points := v_total_points + v_points;

      select qo.is_correct
        into v_is_correct
      from public.question_bank_options qo
      where qo.id = v_opt_id
        and qo.question_id = v_q_id;

      if not found then
        raise exception 'Option % does not belong to question %', v_opt_id, v_q_id;
      end if;

      if coalesce(v_is_correct, false) then
        v_earned_points := v_earned_points + v_points;
      end if;
    end loop;
  end if;

  if v_total_points > 0 then
    v_score_percent := round((v_earned_points / v_total_points) * 100, 2);
  else
    v_score_percent := 0;
  end if;

  v_passed := v_score_percent >= v_passing_score;

  return json_build_object(
    'score', v_score_percent,
    'passed', v_passed,
    'earnedPoints', v_earned_points,
    'totalPoints', v_total_points
  );
end;
$$;

revoke all on function public.check_pool_quiz_answers_for_student(uuid, jsonb) from public;
revoke all on function public.check_pool_quiz_answers_for_student(uuid, jsonb) from anon;
grant execute on function public.check_pool_quiz_answers_for_student(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

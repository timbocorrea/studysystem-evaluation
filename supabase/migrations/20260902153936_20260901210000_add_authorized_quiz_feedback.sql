-- STUDYSYSTEM-2026
-- FASE B1 - Fechamento de leitura direta e feedback pos-submit autorizado.
--
-- A justificativa permanece persistida em question_text. Ela so e separada
-- para o retorno autenticado da tentativa concluida do proprio estudante.

BEGIN;

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/Instructors can do everything on quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Allow admin all on quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Allow public select on quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can select from quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Show quiz_questions to all authenticated" ON public.quiz_questions;

DROP POLICY IF EXISTS "Admins/Instructors can do everything on quiz_options" ON public.quiz_options;
DROP POLICY IF EXISTS "Allow admin all on quiz_options" ON public.quiz_options;
DROP POLICY IF EXISTS "Allow public select on quiz_options" ON public.quiz_options;
DROP POLICY IF EXISTS "Authenticated users can select from quiz_options" ON public.quiz_options;
DROP POLICY IF EXISTS "Show quiz_options to all authenticated" ON public.quiz_options;

-- Somente policies conhecidas podem ser removidas. Qualquer drift desconhecido
-- aborta a transacao para impedir o apagamento silencioso de uma policy futura.
DO $assert_known_quiz_policies$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (
          tablename = 'quiz_questions'
          AND policyname NOT IN (
            'Admins/Instructors can do everything on quiz_questions',
            'Allow admin all on quiz_questions',
            'Allow public select on quiz_questions',
            'Authenticated users can select from quiz_questions',
            'Show quiz_questions to all authenticated',
            'quiz_questions_staff_select',
            'quiz_questions_staff_insert',
            'quiz_questions_staff_update',
            'quiz_questions_staff_delete'
          )
        )
        OR (
          tablename = 'quiz_options'
          AND policyname NOT IN (
            'Admins/Instructors can do everything on quiz_options',
            'Allow admin all on quiz_options',
            'Allow public select on quiz_options',
            'Authenticated users can select from quiz_options',
            'Show quiz_options to all authenticated',
            'quiz_options_staff_select',
            'quiz_options_staff_insert',
            'quiz_options_staff_update',
            'quiz_options_staff_delete'
          )
        )
      )
  LOOP
    RAISE EXCEPTION 'Unexpected policy on public.%: %',
      policy_record.tablename,
      policy_record.policyname;
  END LOOP;
END;
$assert_known_quiz_policies$;

-- A nomenclatura historica das policies nao e confiavel entre ambientes.
-- Remover apenas os nomes conhecidos garante que nenhuma policy futura
-- legitimamente desconhecida seja apagada.
DROP POLICY IF EXISTS quiz_questions_staff_select ON public.quiz_questions;
DROP POLICY IF EXISTS quiz_questions_staff_insert ON public.quiz_questions;
DROP POLICY IF EXISTS quiz_questions_staff_update ON public.quiz_questions;
DROP POLICY IF EXISTS quiz_questions_staff_delete ON public.quiz_questions;
DROP POLICY IF EXISTS quiz_options_staff_select ON public.quiz_options;
DROP POLICY IF EXISTS quiz_options_staff_insert ON public.quiz_options;
DROP POLICY IF EXISTS quiz_options_staff_update ON public.quiz_options;
DROP POLICY IF EXISTS quiz_options_staff_delete ON public.quiz_options;

REVOKE ALL PRIVILEGES ON TABLE public.quiz_questions FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.quiz_options FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quiz_options TO authenticated;

CREATE POLICY quiz_questions_staff_select
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (public.is_current_user_instructor_or_master());

CREATE POLICY quiz_questions_staff_insert
ON public.quiz_questions
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_instructor_or_master());

CREATE POLICY quiz_questions_staff_update
ON public.quiz_questions
FOR UPDATE
TO authenticated
USING (public.is_current_user_instructor_or_master())
WITH CHECK (public.is_current_user_instructor_or_master());

CREATE POLICY quiz_questions_staff_delete
ON public.quiz_questions
FOR DELETE
TO authenticated
USING (public.is_current_user_instructor_or_master());

CREATE POLICY quiz_options_staff_select
ON public.quiz_options
FOR SELECT
TO authenticated
USING (public.is_current_user_instructor_or_master());

CREATE POLICY quiz_options_staff_insert
ON public.quiz_options
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_instructor_or_master());

CREATE POLICY quiz_options_staff_update
ON public.quiz_options
FOR UPDATE
TO authenticated
USING (public.is_current_user_instructor_or_master())
WITH CHECK (public.is_current_user_instructor_or_master());

CREATE POLICY quiz_options_staff_delete
ON public.quiz_options
FOR DELETE
TO authenticated
USING (public.is_current_user_instructor_or_master());

CREATE OR REPLACE FUNCTION public.get_quiz_attempt_feedback(
  p_attempt_id uuid
)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid;
  v_quiz_id uuid;
  v_answers jsonb;
  v_course_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  v_has_static_questions boolean;
  v_questions_count integer;
  v_answers_count integer;
  v_available_questions integer;
  v_expected_count integer;
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT qa.quiz_id,
         qa.answers,
         q.course_id,
         q.module_id,
         q.lesson_id,
         q.questions_count
    INTO v_quiz_id,
         v_answers,
         v_course_id,
         v_module_id,
         v_lesson_id,
         v_questions_count
  FROM public.quiz_attempts qa
  JOIN public.quizzes q
    ON q.id = qa.quiz_id
  WHERE qa.id = p_attempt_id
    AND qa.user_id = v_user_id
    AND qa.completed_at IS NOT NULL;

  -- Ausencia, tentativa de terceiro ou tentativa incompleta falha fechado.
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_answers IS NULL OR jsonb_typeof(v_answers) <> 'object' THEN
    RETURN;
  END IF;

  SELECT count(*)
    INTO v_answers_count
  FROM jsonb_object_keys(v_answers);

  SELECT EXISTS (
    SELECT 1
    FROM public.quiz_questions qq
    WHERE qq.quiz_id = v_quiz_id
  )
  INTO v_has_static_questions;

  IF v_has_static_questions THEN
    SELECT count(*)
      INTO v_available_questions
    FROM public.quiz_questions qq
    WHERE qq.quiz_id = v_quiz_id;

    v_expected_count := LEAST(
      COALESCE(v_questions_count, v_available_questions),
      v_available_questions
    );
  ELSE
    SELECT count(*)
      INTO v_available_questions
    FROM public.question_bank qb
    WHERE coalesce(qb.status, 'active') = 'active'
      AND (v_course_id IS NULL OR qb.course_id = v_course_id)
      AND (v_module_id IS NULL OR qb.module_id = v_module_id)
      AND (v_lesson_id IS NULL OR qb.lesson_id = v_lesson_id);

    v_expected_count := LEAST(
      COALESCE(v_questions_count, 20),
      v_available_questions
    );
  END IF;

  IF v_expected_count IS NULL OR v_expected_count <= 0 THEN
    RETURN;
  END IF;

  IF v_answers_count <> v_expected_count THEN
    RAISE EXCEPTION 'Incomplete quiz attempt feedback is not allowed';
  END IF;

  IF v_has_static_questions THEN
    -- Cada chave/valor persistido precisa continuar vinculado ao quiz.
    IF EXISTS (
      SELECT 1
      FROM jsonb_each_text(v_answers) answer_entry
      WHERE answer_entry.key !~* v_uuid_pattern
         OR answer_entry.value !~* v_uuid_pattern
         OR NOT EXISTS (
              SELECT 1
              FROM public.quiz_questions qq
              JOIN public.quiz_options qo
                ON qo.question_id = qq.id
              WHERE qq.quiz_id = v_quiz_id
                AND qq.id = CASE
                  WHEN answer_entry.key ~* v_uuid_pattern
                    THEN answer_entry.key::uuid
                  ELSE NULL::uuid
                END
                AND qo.id = CASE
                  WHEN answer_entry.value ~* v_uuid_pattern
                    THEN answer_entry.value::uuid
                  ELSE NULL::uuid
                END
            )
    ) THEN
      RAISE EXCEPTION 'Invalid quiz answer scope';
    END IF;
  ELSE
    -- Pool: a questao e valida novamente no escopo do quiz e na fonte pool.
    IF EXISTS (
      SELECT 1
      FROM jsonb_each_text(v_answers) answer_entry
      WHERE answer_entry.key !~* v_uuid_pattern
         OR answer_entry.value !~* v_uuid_pattern
         OR NOT EXISTS (
              SELECT 1
              FROM public.question_bank qb
              JOIN public.question_bank_options qbo
                ON qbo.question_id = qb.id
              WHERE qb.id = CASE
                  WHEN answer_entry.key ~* v_uuid_pattern
                    THEN answer_entry.key::uuid
                  ELSE NULL::uuid
                END
                AND qbo.id = CASE
                  WHEN answer_entry.value ~* v_uuid_pattern
                    THEN answer_entry.value::uuid
                  ELSE NULL::uuid
                END
                AND coalesce(qb.status, 'active') = 'active'
                AND (v_course_id IS NULL OR qb.course_id = v_course_id)
                AND (v_module_id IS NULL OR qb.module_id = v_module_id)
                AND (v_lesson_id IS NULL OR qb.lesson_id = v_lesson_id)
            )
    ) THEN
      RAISE EXCEPTION 'Invalid pool answer scope';
    END IF;
  END IF;

  -- O parser fica centralizado para as fontes static e pool.
  RETURN QUERY
  WITH answer_entries AS (
    SELECT answer_entry.key::uuid AS question_id,
           answer_entry.value::uuid AS option_id
    FROM jsonb_each_text(v_answers) answer_entry
  ),
  selected_answers AS (
    SELECT qq.id AS question_id,
           qq.question_text,
           qq.position AS sort_position,
           qo.option_text AS user_answer,
           qo.is_correct,
           COALESCE((
             SELECT string_agg(correct_option.option_text, ' ou ' ORDER BY correct_option.position)
             FROM public.quiz_options correct_option
             WHERE correct_option.question_id = qq.id
               AND correct_option.is_correct = true
           ), 'Nenhuma resposta configurada como correta') AS correct_answer
    FROM answer_entries answer_entry
    JOIN public.quiz_questions qq
      ON qq.id = answer_entry.question_id
     AND qq.quiz_id = v_quiz_id
    JOIN public.quiz_options qo
      ON qo.id = answer_entry.option_id
     AND qo.question_id = qq.id
    WHERE v_has_static_questions

    UNION ALL

    SELECT qb.id AS question_id,
           qb.question_text,
           NULL::integer AS sort_position,
           qbo.option_text AS user_answer,
           qbo.is_correct,
           COALESCE((
             SELECT string_agg(correct_option.option_text, ' ou ' ORDER BY correct_option.position)
             FROM public.question_bank_options correct_option
             WHERE correct_option.question_id = qb.id
               AND correct_option.is_correct = true
           ), 'Nenhuma resposta configurada como correta') AS correct_answer
    FROM answer_entries answer_entry
    JOIN public.question_bank qb
      ON qb.id = answer_entry.question_id
     AND coalesce(qb.status, 'active') = 'active'
     AND (v_course_id IS NULL OR qb.course_id = v_course_id)
     AND (v_module_id IS NULL OR qb.module_id = v_module_id)
     AND (v_lesson_id IS NULL OR qb.lesson_id = v_lesson_id)
    JOIN public.question_bank_options qbo
      ON qbo.id = answer_entry.option_id
     AND qbo.question_id = qb.id
    WHERE NOT v_has_static_questions
  ),
  parsed_answers AS (
    SELECT selected_answers.*,
           parsed_marker.parts
    FROM selected_answers
    LEFT JOIN LATERAL regexp_match(
      COALESCE(selected_answers.question_text, ''),
      '^\s*(.*?)\s*\*{1,2}\s*Justificativa\s*:\s*\*{1,2}\s*(.*)$',
      'is'
    ) parsed_marker(parts) ON true
  )
  SELECT json_build_object(
    'question_id', parsed_answers.question_id,
    'question_text', CASE
      WHEN parsed_answers.parts IS NULL THEN btrim(COALESCE(parsed_answers.question_text, ''))
      ELSE btrim(COALESCE(parsed_answers.parts[1], ''))
    END,
    'user_answer', parsed_answers.user_answer,
    'correct_answer', parsed_answers.correct_answer,
    'justification', CASE
      WHEN parsed_answers.parts IS NULL THEN ''
      ELSE btrim(COALESCE(parsed_answers.parts[2], ''))
    END,
    'is_correct', parsed_answers.is_correct
  )
  FROM parsed_answers
  ORDER BY parsed_answers.sort_position NULLS LAST, parsed_answers.question_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_quiz_attempt_feedback(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quiz_attempt_feedback(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_quiz_attempt_feedback(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_attempt_feedback(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

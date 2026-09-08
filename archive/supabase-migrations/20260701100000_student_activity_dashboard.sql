-- Staff-only student activity dashboard.
-- The RPCs intentionally expose quiz attempt metadata, never submitted answers.
-- Existing table policies and RLS modes remain unchanged.

CREATE OR REPLACE FUNCTION public.is_current_user_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.is_master_definer()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) IN ('MASTER', 'ADMIN')
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_instructor_or_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.is_current_user_master()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND upper(coalesce(p.role::text, '')) = 'INSTRUCTOR'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.staff_can_access_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_current_user_master()
    OR (
      public.is_current_user_instructor_or_master()
      AND (
        EXISTS (
          SELECT 1
          FROM public.courses c
          WHERE c.id = p_course_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.course_enrollments ce
          WHERE ce.course_id = p_course_id
            AND ce.user_id = auth.uid()
            AND ce.is_active = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.user_course_assignments uca
          WHERE uca.course_id = p_course_id
            AND uca.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.instructor_lesson_assignments ila
          JOIN public.lessons l ON l.id = ila.lesson_id
          JOIN public.modules m ON m.id = l.module_id
          WHERE ila.user_id = auth.uid()
            AND m.course_id = p_course_id
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.staff_can_access_student(
  p_student_id uuid,
  p_course_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_student_id
      AND upper(coalesce(p.role::text, '')) = 'STUDENT'
  )
  AND (
    public.is_current_user_master()

    OR (
      public.is_current_user_instructor_or_master()
      AND EXISTS (
        SELECT 1
        FROM (
          -- Vínculo formal por matrícula ativa do aluno
          SELECT ce.course_id
          FROM public.course_enrollments ce
          WHERE ce.user_id = p_student_id
            AND coalesce(ce.is_active, true) = true

          UNION

          -- Vínculo formal por atribuição direta de curso ao aluno
          SELECT uca.course_id
          FROM public.user_course_assignments uca
          WHERE uca.user_id = p_student_id

          UNION

          -- Vínculo pedagógico por tentativa de quiz em curso do instrutor
          SELECT m.course_id
          FROM public.quiz_attempts qa
          JOIN public.quizzes q ON q.id = qa.quiz_id
          JOIN public.lessons l ON l.id = q.lesson_id
          JOIN public.modules m ON m.id = l.module_id
          WHERE qa.user_id = p_student_id
        ) student_courses
        WHERE (p_course_id IS NULL OR student_courses.course_id = p_course_id)
          AND public.staff_can_access_course(student_courses.course_id)
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_master() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_user_instructor_or_master() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_master() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_instructor_or_master() TO authenticated;

REVOKE ALL ON FUNCTION public.staff_can_access_course(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.staff_can_access_student(uuid, uuid) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.staff_can_access_student(uuid, uuid)
  IS 'Checks whether current staff can access a student by formal course links or quiz attempts in staff-scoped courses.';

CREATE OR REPLACE FUNCTION public.get_student_quiz_attempts_for_staff(
  p_student_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_quiz_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  student_name text,
  student_email text,
  quiz_id uuid,
  quiz_title text,
  lesson_id uuid,
  lesson_title text,
  module_id uuid,
  module_title text,
  course_id uuid,
  course_title text,
  score double precision,
  passed boolean,
  attempt_number integer,
  completed_at timestamptz,
  created_at timestamptz,
  answers_count integer,
  attempt_mode text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_current_user_instructor_or_master() THEN
    RAISE EXCEPTION 'Staff access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    qa.id,
    p.id,
    p.name::text,
    p.email::text,
    q.id,
    q.title::text,
    l.id,
    l.title::text,
    m.id,
    m.title::text,
    c.id,
    c.title::text,
    qa.score::double precision,
    qa.passed,
    qa.attempt_number::integer,
    qa.completed_at,
    qa.created_at,
    CASE
      WHEN jsonb_typeof(qa.answers) = 'object' THEN (
        SELECT count(*)::integer
        FROM jsonb_object_keys(qa.answers) AS answer_keys(key)
      )
      WHEN jsonb_typeof(qa.answers) = 'array' THEN jsonb_array_length(qa.answers)::integer
      ELSE 0
    END AS answers_count,
    'legacy'::text
  FROM public.quiz_attempts qa
  JOIN public.profiles p ON p.id = qa.user_id
  JOIN public.quizzes q ON q.id = qa.quiz_id
  JOIN public.lessons l ON l.id = q.lesson_id
  JOIN public.modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE upper(coalesce(p.role::text, '')) = 'STUDENT'
    AND public.staff_can_access_course(c.id)
    AND (p_student_id IS NULL OR p.id = p_student_id)
    AND (p_course_id IS NULL OR c.id = p_course_id)
    AND (p_quiz_id IS NULL OR q.id = p_quiz_id)
    AND (p_from IS NULL OR coalesce(qa.completed_at, qa.created_at) >= p_from)
    AND (p_to IS NULL OR coalesce(qa.completed_at, qa.created_at) <= p_to)
  ORDER BY coalesce(qa.completed_at, qa.created_at) DESC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 100), 1), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_activity_logs_for_staff(
  p_student_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  student_name text,
  student_email text,
  amount integer,
  action_type text,
  description text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_current_user_instructor_or_master() THEN
    RAISE EXCEPTION 'Staff access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    xh.id,
    p.id,
    p.name::text,
    p.email::text,
    xh.amount::integer,
    xh.action_type::text,
    xh.description::text,
    xh.created_at
  FROM public.xp_history xh
  JOIN public.profiles p ON p.id = xh.user_id
  WHERE public.staff_can_access_student(p.id, p_course_id)
    AND (p_student_id IS NULL OR p.id = p_student_id)
    AND (p_action_type IS NULL OR xh.action_type = p_action_type)
    AND (p_from IS NULL OR xh.created_at >= p_from)
    AND (p_to IS NULL OR xh.created_at <= p_to)
  ORDER BY xh.created_at DESC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 100), 1), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_activity_summary_for_staff(
  p_student_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_quiz_id uuid DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_students bigint,
  total_attempts bigint,
  passed_attempts bigint,
  failed_attempts bigint,
  average_score double precision,
  total_logs bigint,
  active_students_7d bigint,
  active_students_30d bigint,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_current_user_instructor_or_master() THEN
    RAISE EXCEPTION 'Staff access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH eligible_students AS (
    SELECT p.id
    FROM public.profiles p
    WHERE upper(coalesce(p.role::text, '')) = 'STUDENT'
      AND (p_student_id IS NULL OR p.id = p_student_id)
      AND public.staff_can_access_student(p.id, p_course_id)
  ),
  filtered_attempts AS (
    SELECT
      qa.user_id,
      qa.score::double precision AS score,
      qa.passed,
      coalesce(qa.completed_at, qa.created_at) AS activity_at
    FROM public.quiz_attempts qa
    JOIN eligible_students es ON es.id = qa.user_id
    JOIN public.quizzes q ON q.id = qa.quiz_id
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    WHERE public.staff_can_access_course(m.course_id)
      AND (p_course_id IS NULL OR m.course_id = p_course_id)
      AND (p_quiz_id IS NULL OR q.id = p_quiz_id)
      AND (p_from IS NULL OR coalesce(qa.completed_at, qa.created_at) >= p_from)
      AND (p_to IS NULL OR coalesce(qa.completed_at, qa.created_at) <= p_to)
  ),
  filtered_logs AS (
    SELECT xh.user_id, xh.created_at AS activity_at
    FROM public.xp_history xh
    JOIN eligible_students es ON es.id = xh.user_id
    WHERE (p_action_type IS NULL OR xh.action_type = p_action_type)
      AND (p_from IS NULL OR xh.created_at >= p_from)
      AND (p_to IS NULL OR xh.created_at <= p_to)
  ),
  activities AS (
    SELECT user_id, activity_at FROM filtered_attempts
    UNION ALL
    SELECT user_id, activity_at FROM filtered_logs
  )
  SELECT
    (SELECT count(*) FROM eligible_students),
    (SELECT count(*) FROM filtered_attempts),
    (SELECT count(*) FROM filtered_attempts WHERE passed),
    (SELECT count(*) FROM filtered_attempts WHERE NOT passed),
    (SELECT avg(score) FROM filtered_attempts),
    (SELECT count(*) FROM filtered_logs),
    (SELECT count(DISTINCT user_id) FROM activities WHERE activity_at >= now() - interval '7 days'),
    (SELECT count(DISTINCT user_id) FROM activities WHERE activity_at >= now() - interval '30 days'),
    (SELECT max(activity_at) FROM activities);
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_quiz_attempts_for_staff(uuid, uuid, uuid, timestamptz, timestamptz, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_quiz_attempts_for_staff(uuid, uuid, uuid, timestamptz, timestamptz, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_student_activity_logs_for_staff(uuid, uuid, text, timestamptz, timestamptz, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_activity_logs_for_staff(uuid, uuid, text, timestamptz, timestamptz, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_student_activity_summary_for_staff(uuid, uuid, uuid, text, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_activity_summary_for_staff(uuid, uuid, uuid, text, timestamptz, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.get_student_quiz_attempts_for_staff(uuid, uuid, uuid, timestamptz, timestamptz, integer)
  IS 'Returns staff-scoped quiz attempt metadata without submitted answers.';
COMMENT ON FUNCTION public.get_student_activity_logs_for_staff(uuid, uuid, text, timestamptz, timestamptz, integer)
  IS 'Returns staff-scoped student activity logs.';
COMMENT ON FUNCTION public.get_student_activity_summary_for_staff(uuid, uuid, uuid, text, timestamptz, timestamptz)
  IS 'Returns aggregate staff-scoped student activity metrics.';

NOTIFY pgrst, 'reload schema';

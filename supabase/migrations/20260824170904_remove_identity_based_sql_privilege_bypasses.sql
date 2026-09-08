-- StudySystem — remoção de bypasses de autorização por identidade pessoal.
-- Autoridade: auth.uid(), public.profiles.role e ownership/assignments existentes.
-- Esta migration não altera dados, tabelas ou policies.

CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('INSTRUCTOR', 'MASTER')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'MASTER'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_master_definer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND (
      (auth.jwt() ->> 'role') = 'MASTER'
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'MASTER'
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_pending_student_answers(p_instructor_id uuid)
RETURNS TABLE (
  user_id UUID,
  lesson_id UUID,
  block_id TEXT,
  answer_text TEXT,
  updated_at TIMESTAMPTZ,
  student_name TEXT,
  lesson_title TEXT,
  course_title TEXT
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor_id UUID := auth.uid();
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sa.user_id,
    sa.lesson_id,
    sa.block_id,
    sa.answer_text,
    sa.updated_at,
    p.name AS student_name,
    l.title AS lesson_title,
    c.title AS course_title
  FROM public.student_answers sa
  JOIN public.profiles p ON p.id = sa.user_id
  JOIN public.lessons l ON l.id = sa.lesson_id
  JOIN public.modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE EXISTS (
    SELECT 1
    FROM public.profiles actor
    WHERE actor.id = v_actor_id
      AND (
        actor.role = 'MASTER'
        OR (
          actor.role = 'INSTRUCTOR'
          AND (
            c.instructor_id = v_actor_id
            OR EXISTS (
              SELECT 1
              FROM public.instructor_lesson_assignments ila
              WHERE ila.lesson_id = sa.lesson_id
                AND ila.user_id = v_actor_id
            )
          )
        )
      )
  )
    AND sa.feedback_text IS NULL
  ORDER BY sa.updated_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pending_forum_messages(p_instructor_id uuid)
RETURNS TABLE (
  id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  image_url TEXT,
  lesson_id UUID,
  user_id UUID,
  parent_id UUID,
  is_pinned BOOLEAN,
  is_edited BOOLEAN,
  user_name TEXT,
  user_role TEXT,
  lesson_title TEXT,
  course_title TEXT
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor_id UUID := auth.uid();
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.created_at,
    m.image_url,
    m.lesson_id,
    m.user_id,
    m.parent_id,
    m.is_pinned,
    m.is_edited,
    p.name AS user_name,
    p.role AS user_role,
    l.title AS lesson_title,
    c.title AS course_title
  FROM public.lesson_forum_messages m
  JOIN public.profiles p ON p.id = m.user_id
  JOIN public.lessons l ON l.id = m.lesson_id
  JOIN public.modules mod ON mod.id = l.module_id
  JOIN public.courses c ON c.id = mod.course_id
  WHERE EXISTS (
    SELECT 1
    FROM public.profiles actor
    WHERE actor.id = v_actor_id
      AND (
        actor.role = 'MASTER'
        OR (
          actor.role = 'INSTRUCTOR'
          AND (
            c.instructor_id = v_actor_id
            OR EXISTS (
              SELECT 1
              FROM public.instructor_lesson_assignments ila
              WHERE ila.lesson_id = m.lesson_id
                AND ila.user_id = v_actor_id
            )
          )
        )
      )
  )
    AND m.parent_id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.lesson_forum_messages r
      JOIN public.profiles rp ON rp.id = r.user_id
      WHERE r.parent_id = m.id
        AND rp.role IN ('INSTRUCTOR', 'MASTER')
    )
  ORDER BY m.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.is_instructor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_instructor() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_instructor() TO authenticated;

REVOKE ALL ON FUNCTION public.is_master() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_master() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated;

REVOKE ALL ON FUNCTION public.is_master_definer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_master_definer() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_master_definer() TO authenticated;

REVOKE ALL ON FUNCTION public.get_pending_student_answers(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_student_answers(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_student_answers(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_pending_forum_messages(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_forum_messages(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_forum_messages(uuid) TO authenticated;

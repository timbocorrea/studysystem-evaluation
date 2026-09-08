BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_course_enrollments(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
  WITH actor AS (
    SELECT (SELECT auth.uid()) AS user_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM actor a
    JOIN public.profiles p
      ON p.id = a.user_id
    WHERE a.user_id IS NOT NULL
      AND p.role = 'INSTRUCTOR'
      AND (
        EXISTS (
          SELECT 1
          FROM public.courses c
          WHERE c.id = p_course_id
            AND c.instructor_id = a.user_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.course_enrollments ce
          WHERE ce.user_id = a.user_id
            AND ce.course_id = p_course_id
            AND ce.is_active = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.instructor_lesson_assignments ila
          JOIN public.lessons l
            ON l.id = ila.lesson_id
          JOIN public.modules m
            ON m.id = l.module_id
          WHERE ila.user_id = a.user_id
            AND m.course_id = p_course_id
        )
      )
  );
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION public.can_manage_course_enrollments(uuid)
FROM PUBLIC;

REVOKE ALL PRIVILEGES ON FUNCTION public.can_manage_course_enrollments(uuid)
FROM anon;

GRANT EXECUTE ON FUNCTION public.can_manage_course_enrollments(uuid)
TO authenticated;

DROP POLICY IF EXISTS enrollments_view_instructor
  ON public.course_enrollments;

DROP POLICY IF EXISTS enrollments_insert_instructor
  ON public.course_enrollments;

DROP POLICY IF EXISTS enrollments_update_instructor
  ON public.course_enrollments;

DROP POLICY IF EXISTS enrollments_delete_instructor
  ON public.course_enrollments;

CREATE POLICY enrollments_view_instructor
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (
  public.can_manage_course_enrollments(course_id)
);

CREATE POLICY enrollments_insert_instructor
ON public.course_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_course_enrollments(course_id)
);

CREATE POLICY enrollments_update_instructor
ON public.course_enrollments
FOR UPDATE
TO authenticated
USING (
  public.can_manage_course_enrollments(course_id)
)
WITH CHECK (
  public.can_manage_course_enrollments(course_id)
);

CREATE POLICY enrollments_delete_instructor
ON public.course_enrollments
FOR DELETE
TO authenticated
USING (
  public.can_manage_course_enrollments(course_id)
);

NOTIFY pgrst, 'reload schema';

COMMIT;

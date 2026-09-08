BEGIN;

DROP POLICY IF EXISTS enrollments_insert_self
  ON public.course_enrollments;

DROP POLICY IF EXISTS enrollments_update_self
  ON public.course_enrollments;

DROP POLICY IF EXISTS enrollments_delete_self
  ON public.course_enrollments;

COMMIT;

NOTIFY pgrst, 'reload schema';

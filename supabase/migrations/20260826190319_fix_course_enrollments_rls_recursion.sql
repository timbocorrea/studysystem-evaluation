-- StudySystem — break profiles <-> course_enrollments SELECT RLS recursion
-- while preserving the existing INSTRUCTOR-only visibility semantics.

BEGIN;

DROP POLICY IF EXISTS enrollments_view_instructor
ON public.course_enrollments;

CREATE POLICY enrollments_view_instructor
ON public.course_enrollments
FOR SELECT
TO PUBLIC
USING (
  public.is_instructor()
  AND NOT public.is_master()
);

COMMIT;

NOTIFY pgrst, 'reload schema';

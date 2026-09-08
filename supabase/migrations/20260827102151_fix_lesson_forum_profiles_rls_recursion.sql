-- StudySystem — break profiles <-> lesson_forum_messages SELECT RLS recursion
-- while preserving enrollment-based access and existing INSTRUCTOR/MASTER staff visibility.

BEGIN;

DROP POLICY IF EXISTS "Alunos podem ler mensagens de lições acessíveis"
ON public.lesson_forum_messages;

CREATE POLICY "Alunos podem ler mensagens de lições acessíveis"
ON public.lesson_forum_messages
FOR SELECT
TO PUBLIC
USING (
  EXISTS (
    SELECT 1
    FROM public.course_enrollments e
    JOIN public.modules m ON m.course_id = e.course_id
    JOIN public.lessons l ON l.module_id = m.id
    WHERE l.id = lesson_forum_messages.lesson_id
      AND e.user_id = auth.uid()
      AND e.is_active = true
  )
  OR public.is_instructor()
);

COMMIT;

NOTIFY pgrst, 'reload schema';

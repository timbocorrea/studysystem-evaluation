BEGIN;

CREATE OR REPLACE FUNCTION public.can_access_lesson_forum(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
  SELECT public.is_master_definer()
    OR EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.modules m
        ON m.id = l.module_id
      WHERE l.id = p_lesson_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.course_enrollments ce
            WHERE ce.course_id = m.course_id
              AND ce.user_id = auth.uid()
              AND ce.is_active = true
          )
          OR EXISTS (
            SELECT 1
            FROM public.courses c
            WHERE c.id = m.course_id
              AND c.instructor_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.instructor_lesson_assignments ila
            WHERE ila.lesson_id = l.id
              AND ila.user_id = auth.uid()
          )
        )
    );
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION public.can_access_lesson_forum(uuid)
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.can_access_lesson_forum(uuid)
FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_lesson_forum(uuid)
TO authenticated;

DROP POLICY IF EXISTS "Alunos podem ler mensagens de lições acessíveis"
  ON public.lesson_forum_messages;
DROP POLICY IF EXISTS "Forum messages viewable by assigned users"
  ON public.lesson_forum_messages;
DROP POLICY IF EXISTS "Alunos podem postar mensagens"
  ON public.lesson_forum_messages;
DROP POLICY IF EXISTS "Moderadores podem editar mensagens"
  ON public.lesson_forum_messages;
DROP POLICY IF EXISTS "Moderadores podem deletar mensagens"
  ON public.lesson_forum_messages;

DROP POLICY IF EXISTS lesson_forum_select_scoped
  ON public.lesson_forum_messages;
DROP POLICY IF EXISTS lesson_forum_insert_scoped
  ON public.lesson_forum_messages;
DROP POLICY IF EXISTS lesson_forum_update_moderator_scoped
  ON public.lesson_forum_messages;
DROP POLICY IF EXISTS lesson_forum_delete_moderator_scoped
  ON public.lesson_forum_messages;
DROP POLICY IF EXISTS lesson_forum_update_staff_scoped
  ON public.lesson_forum_messages;
DROP POLICY IF EXISTS lesson_forum_delete_staff_scoped
  ON public.lesson_forum_messages;

CREATE POLICY lesson_forum_select_scoped
ON public.lesson_forum_messages
FOR SELECT
TO authenticated
USING (
  public.can_access_lesson_forum(lesson_id)
);

CREATE POLICY lesson_forum_insert_scoped
ON public.lesson_forum_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.can_access_lesson_forum(lesson_id)
);

CREATE POLICY lesson_forum_update_staff_scoped
ON public.lesson_forum_messages
FOR UPDATE
TO authenticated
USING (
  public.can_manage_lesson_content(lesson_id)
)
WITH CHECK (
  public.can_manage_lesson_content(lesson_id)
);

CREATE POLICY lesson_forum_delete_staff_scoped
ON public.lesson_forum_messages
FOR DELETE
TO authenticated
USING (
  public.can_manage_lesson_content(lesson_id)
);

NOTIFY pgrst, 'reload schema';

COMMIT;

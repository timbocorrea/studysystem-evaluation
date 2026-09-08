BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_course_content(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
  SELECT public.is_master_definer()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'INSTRUCTOR'
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
            WHERE ce.user_id = auth.uid()
              AND ce.course_id = p_course_id
              AND ce.is_active = true
          )
        )
    );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_module_content(p_module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
  SELECT public.is_master_definer()
    OR EXISTS (
      SELECT 1
      FROM public.modules m
      WHERE m.id = p_module_id
        AND public.can_manage_course_content(m.course_id)
    );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_lesson_content(p_lesson_id uuid)
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
          public.can_manage_course_content(m.course_id)
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            JOIN public.instructor_lesson_assignments ila
              ON ila.user_id = p.id
             AND ila.lesson_id = l.id
            WHERE p.id = auth.uid()
              AND p.role = 'INSTRUCTOR'
          )
        )
    );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_lesson_target(
  p_lesson_id uuid,
  p_target_module_id uuid
)
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
      JOIN public.modules source_module
        ON source_module.id = l.module_id
      JOIN public.modules target_module
        ON target_module.id = p_target_module_id
      WHERE l.id = p_lesson_id
        AND source_module.course_id = target_module.course_id
        AND public.can_manage_lesson_content(l.id)
    );
$function$;

CREATE OR REPLACE FUNCTION public.enforce_course_instructor_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  actor_role text;
BEGIN
  IF public.is_master_definer() OR actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.role::text
    INTO actor_role
  FROM public.profiles p
  WHERE p.id = actor_id;

  IF actor_role IS DISTINCT FROM 'INSTRUCTOR' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.instructor_id IS NULL THEN
      NEW.instructor_id := actor_id;
    ELSIF NEW.instructor_id IS DISTINCT FROM actor_id THEN
      RAISE EXCEPTION 'Instructor can only create a course owned by the current user'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.instructor_id IS DISTINCT FROM OLD.instructor_id THEN
    RAISE EXCEPTION 'Instructor cannot change course ownership'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION public.can_manage_course_content(uuid)
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.can_manage_course_content(uuid)
FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_course_content(uuid)
TO authenticated;

REVOKE ALL PRIVILEGES ON FUNCTION public.can_manage_module_content(uuid)
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.can_manage_module_content(uuid)
FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_module_content(uuid)
TO authenticated;

REVOKE ALL PRIVILEGES ON FUNCTION public.can_manage_lesson_content(uuid)
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.can_manage_lesson_content(uuid)
FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_lesson_content(uuid)
TO authenticated;

REVOKE ALL PRIVILEGES ON FUNCTION public.can_manage_lesson_target(uuid, uuid)
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.can_manage_lesson_target(uuid, uuid)
FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_lesson_target(uuid, uuid)
TO authenticated;

REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_course_instructor_ownership()
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_course_instructor_ownership()
FROM anon;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_course_instructor_ownership()
FROM authenticated;

DROP TRIGGER IF EXISTS courses_enforce_instructor_ownership
  ON public.courses;

CREATE TRIGGER courses_enforce_instructor_ownership
BEFORE INSERT OR UPDATE OF instructor_id
ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_course_instructor_ownership();

DROP POLICY IF EXISTS courses_insert_instructors
  ON public.courses;
DROP POLICY IF EXISTS courses_update_instructors
  ON public.courses;
DROP POLICY IF EXISTS courses_delete_instructors
  ON public.courses;

CREATE POLICY courses_insert_instructors
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master_definer()
  OR (
    public.is_instructor()
    AND instructor_id = auth.uid()
  )
);

CREATE POLICY courses_update_instructors
ON public.courses
FOR UPDATE
TO authenticated
USING (
  public.can_manage_course_content(id)
)
WITH CHECK (
  public.is_master_definer()
  OR public.can_manage_course_content(id)
);

CREATE POLICY courses_delete_instructors
ON public.courses
FOR DELETE
TO authenticated
USING (
  public.can_manage_course_content(id)
);

DROP POLICY IF EXISTS modules_insert_instructors
  ON public.modules;
DROP POLICY IF EXISTS modules_update_instructors
  ON public.modules;
DROP POLICY IF EXISTS modules_delete_instructors
  ON public.modules;

CREATE POLICY modules_insert_instructors
ON public.modules
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_course_content(course_id)
);

CREATE POLICY modules_update_instructors
ON public.modules
FOR UPDATE
TO authenticated
USING (
  public.can_manage_module_content(id)
)
WITH CHECK (
  public.can_manage_course_content(course_id)
);

CREATE POLICY modules_delete_instructors
ON public.modules
FOR DELETE
TO authenticated
USING (
  public.can_manage_module_content(id)
);

DROP POLICY IF EXISTS lessons_insert_instructors
  ON public.lessons;
DROP POLICY IF EXISTS lessons_update_instructors
  ON public.lessons;
DROP POLICY IF EXISTS lessons_update_hardened
  ON public.lessons;
DROP POLICY IF EXISTS lessons_delete_instructors
  ON public.lessons;

CREATE POLICY lessons_insert_instructors
ON public.lessons
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_module_content(module_id)
);

CREATE POLICY lessons_update_instructors
ON public.lessons
FOR UPDATE
TO authenticated
USING (
  public.can_manage_lesson_content(id)
)
WITH CHECK (
  public.can_manage_lesson_target(id, module_id)
);

CREATE POLICY lessons_delete_instructors
ON public.lessons
FOR DELETE
TO authenticated
USING (
  public.can_manage_lesson_content(id)
);

DROP POLICY IF EXISTS lesson_resources_write_auth
  ON public.lesson_resources;
DROP POLICY IF EXISTS lesson_resources_update_auth
  ON public.lesson_resources;
DROP POLICY IF EXISTS lesson_resources_delete_auth
  ON public.lesson_resources;
DROP POLICY IF EXISTS lesson_resources_insert_instructors
  ON public.lesson_resources;
DROP POLICY IF EXISTS lesson_resources_update_instructors
  ON public.lesson_resources;
DROP POLICY IF EXISTS lesson_resources_delete_instructors
  ON public.lesson_resources;

CREATE POLICY lesson_resources_insert_instructors
ON public.lesson_resources
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_lesson_content(lesson_id)
);

CREATE POLICY lesson_resources_update_instructors
ON public.lesson_resources
FOR UPDATE
TO authenticated
USING (
  public.can_manage_lesson_content(lesson_id)
)
WITH CHECK (
  public.can_manage_lesson_content(lesson_id)
);

CREATE POLICY lesson_resources_delete_instructors
ON public.lesson_resources
FOR DELETE
TO authenticated
USING (
  public.can_manage_lesson_content(lesson_id)
);

NOTIFY pgrst, 'reload schema';

COMMIT;

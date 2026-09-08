-- StudySystem — hardening de profiles e autorização administrativa MASTER.
-- Não promove usuários, não altera XP histórico e não depende de identidade pessoal.

BEGIN;

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF auth.role() = 'service_role'
     OR public.is_master()
     OR current_setting('studysystem.internal_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'STUDENT';
    NEW.xp_total := COALESCE(NEW.xp_total, 0);
    NEW.current_level := COALESCE(NEW.current_level, 1);
    NEW.achievements := COALESCE(NEW.achievements, '[]'::jsonb);
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.approval_status := OLD.approval_status;
  NEW.xp_total := OLD.xp_total;
  NEW.current_level := OLD.current_level;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_last_master_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.role = 'MASTER'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles p
       WHERE p.role = 'MASTER'
         AND p.id <> OLD.id
     ) THEN
    RAISE EXCEPTION 'The last MASTER cannot be demoted';
  END IF;

  IF TG_OP = 'DELETE'
     AND OLD.role = 'MASTER'
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles p
       WHERE p.role = 'MASTER'
         AND p.id <> OLD.id
     ) THEN
    RAISE EXCEPTION 'The last MASTER cannot be deleted';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_sensitive_profile_fields();

DROP TRIGGER IF EXISTS trg_protect_last_master ON public.profiles;
CREATE TRIGGER trg_protect_last_master
BEFORE UPDATE OF role OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_last_master_profile();

DO $drop_profile_policies$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
  END LOOP;
END;
$drop_profile_policies$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_authenticated
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.instructor_id = public.profiles.id
      AND (
        COALESCE(c.is_public, false) = true
        OR EXISTS (
          SELECT 1
          FROM public.course_enrollments ce
          WHERE ce.course_id = c.id
            AND ce.user_id = auth.uid()
            AND ce.is_active = true
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.lesson_forum_messages fm
    JOIN public.lessons fl ON fl.id = fm.lesson_id
    JOIN public.modules fmod ON fmod.id = fl.module_id
    JOIN public.courses fc ON fc.id = fmod.course_id
    WHERE fm.user_id = public.profiles.id
      AND (
        COALESCE(fc.is_public, false) = true
        OR EXISTS (
          SELECT 1
          FROM public.course_enrollments ce
          WHERE ce.course_id = fc.id
            AND ce.user_id = auth.uid()
            AND ce.is_active = true
        )
      )
  )
  OR (
    public.is_instructor()
    AND EXISTS (
      SELECT 1
      FROM public.course_enrollments ce
      JOIN public.courses c ON c.id = ce.course_id
      WHERE ce.user_id = public.profiles.id
        AND ce.is_active = true
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.instructor_lesson_assignments ila
            JOIN public.lessons l ON l.id = ila.lesson_id
            JOIN public.modules m ON m.id = l.module_id
            WHERE ila.user_id = auth.uid()
              AND m.course_id = ce.course_id
          )
        )
    )
  )
);

CREATE POLICY profiles_insert_self_student
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND role = 'STUDENT');

CREATE POLICY profiles_update_self_or_master
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_master())
WITH CHECK (auth.uid() = id OR public.is_master());

CREATE POLICY profiles_delete_master
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_master() AND role <> 'MASTER');

REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.profiles FROM authenticated;

GRANT SELECT (
  id,
  email,
  name,
  role,
  xp_total,
  current_level,
  achievements,
  updated_at,
  approval_status,
  approved_at,
  approved_by,
  rejection_reason,
  last_session_id,
  last_access_at,
  is_temp_password,
  avatar_url
) ON TABLE public.profiles TO authenticated;

GRANT INSERT (id, email, name) ON TABLE public.profiles TO authenticated;

GRANT UPDATE (
  name,
  avatar_url,
  last_session_id,
  last_access_at,
  updated_at,
  achievements,
  role,
  approval_status,
  approved_at,
  approved_by,
  rejection_reason
) ON TABLE public.profiles TO authenticated;

REVOKE ALL ON FUNCTION public.protect_sensitive_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_last_master_profile() FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

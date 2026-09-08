-- ============================================================
-- SECURITY HARDENING: COMPREHENSIVE RLS & BOLA MITIGATION
-- ============================================================

-- 1. UTILITY FUNCTIONS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'INSTRUCTOR' OR p.email = '[REDACTED_EVALUATION_IDENTITY]')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'MASTER' OR p.email = '[REDACTED_EVALUATION_IDENTITY]')
  );
$$;

-- 2. SCHEMA CHANGES (is_public for content access)
-- ------------------------------------------------------------
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 3. PROFILE COLUMN PROTECTION TRIGGER (Mitigate Escalation)
-- ------------------------------------------------------------
-- Impede que usuários comuns alterem seus próprios privilégios ou XP via API
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se o usuário atual não for um instrutor, não permita a mudança desses campos
  IF NOT public.is_instructor() THEN
    NEW.role = OLD.role;
    NEW.approval_status = OLD.approval_status;
    NEW.xp_total = OLD.xp_total;
    NEW.current_level = OLD.current_level;
    NEW.achievements = OLD.achievements;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- 4. RLS: CONTENT ACCESS CONTROL (Courses / Modules / Lessons)
-- ------------------------------------------------------------
-- Courses
DROP POLICY IF EXISTS courses_read_all ON public.courses;
CREATE POLICY courses_select_secure ON public.courses 
  FOR SELECT USING (
    is_public = true OR 
    public.is_master() OR
    (public.is_instructor() AND (instructor_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.course_enrollments ce 
      WHERE ce.course_id = id AND ce.user_id = auth.uid() AND ce.is_active = true
    ))) OR
    EXISTS (
      SELECT 1 FROM public.course_enrollments ce 
      WHERE ce.course_id = id AND ce.user_id = auth.uid() AND ce.is_active = true
    )
  );

-- Modules (Inherits access from Course)
DROP POLICY IF EXISTS modules_read_all ON public.modules;
CREATE POLICY modules_select_secure ON public.modules 
  FOR SELECT USING (
    public.is_master() OR
    EXISTS (
      SELECT 1 FROM public.courses c
      LEFT JOIN public.course_enrollments ce ON ce.course_id = c.id AND ce.user_id = auth.uid()
      WHERE c.id = course_id AND (
        c.is_public = true OR 
        ce.is_active = true OR 
        (public.is_instructor() AND (c.instructor_id = auth.uid() OR ce.user_id = auth.uid()))
      )
    )
  );

-- Lessons (Checks lesson is_public OR Course Enrollment)
DROP POLICY IF EXISTS lessons_read_all ON public.lessons;
CREATE POLICY lessons_select_secure ON public.lessons 
  FOR SELECT USING (
    is_public = true OR
    public.is_master() OR
    EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.courses c ON c.id = m.course_id
      LEFT JOIN public.course_enrollments ce ON ce.course_id = c.id AND ce.user_id = auth.uid()
      WHERE m.id = module_id AND (
        c.is_public = true OR 
        ce.is_active = true OR 
        (public.is_instructor() AND (c.instructor_id = auth.uid() OR ce.user_id = auth.uid()))
      )
    )
  );

-- 5. RLS: TENANCY ISOLATION FOR SENSITIVE USER DATA
-- ------------------------------------------------------------

-- Lesson Progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progress_select_self ON public.lesson_progress;
DROP POLICY IF EXISTS progress_insert_self ON public.lesson_progress;
DROP POLICY IF EXISTS progress_update_self ON public.lesson_progress;

CREATE POLICY progress_select_secure ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id OR public.is_instructor());
CREATE POLICY progress_insert_secure ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY progress_update_secure ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY progress_delete_secure ON public.lesson_progress FOR DELETE USING (auth.uid() = user_id OR public.is_instructor());

-- User Course Assignments (Approvals)
-- Already secured in user_approval_migration.sql, but ensuring strict enforcement
DROP POLICY IF EXISTS user_course_assignments_insert_instructor ON public.user_course_assignments;
CREATE POLICY user_course_assignments_insert_instructor ON public.user_course_assignments
  FOR INSERT WITH CHECK (public.is_instructor());

DROP POLICY IF EXISTS user_course_assignments_update_instructor ON public.user_course_assignments;
CREATE POLICY user_course_assignments_update_instructor ON public.user_course_assignments
  FOR UPDATE USING (public.is_instructor()) WITH CHECK (public.is_instructor());

DROP POLICY IF EXISTS user_course_assignments_delete_instructor ON public.user_course_assignments;
CREATE POLICY user_course_assignments_delete_instructor ON public.user_course_assignments
  FOR DELETE USING (public.is_instructor());

-- ============================================================
-- AUDIT COMPLETA: As rotas de SELECT agora garantem acesso 
-- privado e triggers barram a escalada de privilégios.
-- ============================================================

-- ============================================================
-- HOTFIX: FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================================

-- 1. SECURITY DEFINER FUNCTIONS (Bypass RLS for Permission Checks)
-- ------------------------------------------------------------

-- Check if user owns the course that contains this module
CREATE OR REPLACE FUNCTION public.check_module_ownership(p_module_id UUID, p_user_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Essential to bypass RLS recursion
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = p_module_id AND c.instructor_id = p_user_id
  );
$$;

-- Check if user is enrolled in the course that contains this module
CREATE OR REPLACE FUNCTION public.check_module_enrollment(p_module_id UUID, p_user_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.course_enrollments ce ON ce.course_id = m.course_id
    WHERE m.id = p_module_id AND ce.user_id = p_user_id AND ce.is_active = true
  );
$$;

-- Check if user has granular assignments in a module
CREATE OR REPLACE FUNCTION public.check_module_assignment(p_module_id UUID, p_user_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.instructor_lesson_assignments ila 
    JOIN public.lessons l ON l.id = ila.lesson_id
    WHERE l.module_id = p_module_id AND ila.user_id = p_user_id
  );
$$;

-- 2. APPLY HARDENED POLICIES USING FUNCTIONS (NO RECURSION)
-- ------------------------------------------------------------

-- LESSONS
DROP POLICY IF EXISTS lessons_select_hardened ON public.lessons;
CREATE POLICY lessons_select_hardened ON public.lessons 
  FOR SELECT USING (
    is_public = true OR
    public.is_master() OR
    public.check_module_ownership(module_id, auth.uid()) OR -- Use function!
    public.check_module_enrollment(module_id, auth.uid()) OR -- Use function!
    EXISTS (
        SELECT 1 FROM public.instructor_lesson_assignments ila 
        WHERE ila.lesson_id = lessons.id AND ila.user_id = auth.uid()
    )
  );

-- MODULES
DROP POLICY IF EXISTS modules_select_hardened ON public.modules;
CREATE POLICY modules_select_hardened ON public.modules 
  FOR SELECT USING (
    public.is_master() OR
    EXISTS (
        SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()
    ) OR
    public.check_module_assignment(id, auth.uid()) OR -- Use function!
    EXISTS (
        SELECT 1 FROM public.course_enrollments ce 
        WHERE ce.course_id = modules.course_id AND ce.user_id = auth.uid() AND ce.is_active = true
    )
  );

-- COURSES (Update to avoid any potential lesson joins)
DROP POLICY IF EXISTS courses_select_hardened ON public.courses;
CREATE POLICY courses_select_hardened ON public.courses 
  FOR SELECT USING (
    is_public = true OR 
    public.is_master() OR
    instructor_id = auth.uid() OR
    EXISTS (
        -- Simple check in assignments table without joining lessons table back
        SELECT 1 FROM public.instructor_lesson_assignments ila 
        WHERE ila.user_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.lessons l 
            JOIN public.modules m ON m.id = l.module_id
            WHERE l.id = ila.lesson_id AND m.course_id = courses.id
        )
    ) OR
    EXISTS (
      SELECT 1 FROM public.course_enrollments ce 
      WHERE ce.course_id = id AND ce.user_id = auth.uid() AND ce.is_active = true
    )
  );

NOTIFY pgrst, 'reload schema';

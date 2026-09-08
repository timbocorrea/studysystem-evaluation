-- ============================================================
-- FINAL FIX: ELIMINATE RLS RECURSION WITH ATOMIC PERMISSION FUNCTIONS
-- ============================================================

-- 1. DROP ALL PREVIOUS AMBIGUOUS FUNCTIONS AND POLICIES
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.check_module_ownership(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.check_module_enrollment(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.check_module_assignment(UUID, UUID) CASCADE;

-- 2. NEW ATOMIC FUNCTIONS (NO INTERNAL RECURSION)
-- ------------------------------------------------------------

-- Check if user is MASTER (by role or by master email)
CREATE OR REPLACE FUNCTION public.is_master_definer()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT (auth.jwt() ->> 'role') = 'MASTER' OR 
         (auth.jwt() ->> 'email') = '[REDACTED_EVALUATION_IDENTITY]' OR
         EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MASTER');
$$;

-- Check if user is the OWNER of a course
CREATE OR REPLACE FUNCTION public.is_course_owner(p_course_id UUID)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id AND instructor_id = auth.uid());
$$;

-- Check if user is assigned to a course (via enrollment)
CREATE OR REPLACE FUNCTION public.is_course_enrolled(p_course_id UUID)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = p_course_id AND user_id = auth.uid() AND is_active = true);
$$;

-- Check if user has ANY assigned lesson in a course
CREATE OR REPLACE FUNCTION public.has_course_assignment(p_course_id UUID)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.instructor_lesson_assignments ila 
    JOIN public.lessons l ON l.id = ila.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    WHERE m.course_id = p_course_id AND ila.user_id = auth.uid()
  );
$$;

-- Check access to a module (Owner OR Assigned in that module)
CREATE OR REPLACE FUNCTION public.has_module_access(p_module_id UUID)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    -- Case: Owner
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = p_module_id AND c.instructor_id = auth.uid()
  ) OR EXISTS (
    -- Case: Assigned via lessons inside this module
    SELECT 1 FROM public.instructor_lesson_assignments ila 
    JOIN public.lessons l ON l.id = ila.lesson_id
    WHERE l.module_id = p_module_id AND ila.user_id = auth.uid()
  ) OR EXISTS (
    -- Case: Student enrolled
    SELECT 1 FROM public.modules m
    JOIN public.course_enrollments ce ON ce.course_id = m.course_id
    WHERE m.id = p_module_id AND ce.user_id = auth.uid() AND ce.is_active = true
  );
$$;

-- 3. REDEFINE ALL POLICIES USING ONLY ATOMIC CHECKS
-- ------------------------------------------------------------

-- COURSES
DROP POLICY IF EXISTS courses_select_hardened ON public.courses;
CREATE POLICY courses_select_hardened ON public.courses 
  FOR SELECT USING (
    is_public = true OR 
    public.is_master_definer() OR
    instructor_id = auth.uid() OR
    public.is_course_enrolled(id) OR
    public.has_course_assignment(id)
  );

-- MODULES
DROP POLICY IF EXISTS modules_select_hardened ON public.modules;
CREATE POLICY modules_select_hardened ON public.modules 
  FOR SELECT USING (
    public.is_master_definer() OR
    public.has_module_access(id)
  );

-- LESSONS
DROP POLICY IF EXISTS lessons_select_hardened ON public.lessons;
CREATE POLICY lessons_select_hardened ON public.lessons 
  FOR SELECT USING (
    is_public = true OR
    public.is_master_definer() OR
    public.has_module_access(module_id) OR
    EXISTS (
        SELECT 1 FROM public.instructor_lesson_assignments ila 
        WHERE ila.lesson_id = id AND ila.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';

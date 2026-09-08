-- ============================================================
-- GRANULAR LESSON PERMISSIONS FOR INSTRUCTORS
-- ============================================================

-- 1. Create assignments table
CREATE TABLE IF NOT EXISTS public.instructor_lesson_assignments (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, lesson_id)
);

-- 2. Enable RLS
ALTER TABLE public.instructor_lesson_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Policies for assignments table
DROP POLICY IF EXISTS "Allow master to manage lesson assignments" ON public.instructor_lesson_assignments;
CREATE POLICY "Allow master to manage lesson assignments" ON public.instructor_lesson_assignments
    FOR ALL USING (public.is_master());

DROP POLICY IF EXISTS "Allow instructors to view their own lesson assignments" ON public.instructor_lesson_assignments;
CREATE POLICY "Allow instructors to view their own lesson assignments" ON public.instructor_lesson_assignments
    FOR SELECT USING (user_id = auth.uid());

-- 4. UPDATE POLICY FOR LESSONS
-- We need to ensure that only masters or assigned instructors can update lessons.
-- First, find existing broad update policies if any and drop them if they are too permissive.
-- Note: Often they are restricted to postgres or masters by default if not created.

DROP POLICY IF EXISTS "Instructors can update assigned lessons" ON public.lessons;
CREATE POLICY "Instructors can update assigned lessons" ON public.lessons
    FOR UPDATE
    USING (
        public.is_master() OR
        (public.is_instructor() AND (
            -- Assigned via granular permissions
            EXISTS (
                SELECT 1 FROM public.instructor_lesson_assignments ila
                WHERE ila.lesson_id = lessons.id AND ila.user_id = auth.uid()
            )
            OR
            -- Assigned as primary instructor of the course
            EXISTS (
                SELECT 1 FROM public.modules m
                JOIN public.courses c ON c.id = m.course_id
                WHERE m.id = lessons.module_id AND c.instructor_id = auth.uid()
            )
        ))
    );

-- 5. Repeat for modules and courses if necessary?
-- The user specifically asked for lessons within modules.
-- Usually, if they can edit a lesson, they might need to see the module.
-- Select policies are already handled by course_enrollments in previous migrations.

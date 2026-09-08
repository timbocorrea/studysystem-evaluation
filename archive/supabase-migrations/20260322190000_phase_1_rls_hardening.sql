-- ============================================================
-- PHASE 1: SECURITY HARDENING (IMPENETRABLE RLS)
-- ============================================================

-- 1. HARDEN LESSONS (SELECT & UPDATE)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS lessons_select_secure ON public.lessons;
CREATE POLICY lessons_select_hardened ON public.lessons 
  FOR SELECT USING (
    is_public = true OR
    public.is_master() OR
    EXISTS (
        -- Permitir se for o DONO do curso
        SELECT 1 FROM public.modules m
        JOIN public.courses c ON c.id = m.course_id
        WHERE m.id = lessons.module_id AND c.instructor_id = auth.uid()
    ) OR
    EXISTS (
        -- Permitir se for ATRIBUÍDO granularmente
        SELECT 1 FROM public.instructor_lesson_assignments ila 
        WHERE ila.lesson_id = lessons.id AND ila.user_id = auth.uid()
    ) OR
    EXISTS (
        -- Permitir se for ALUNO inscrito
        SELECT 1 FROM public.modules m
        JOIN public.courses c ON c.id = m.course_id
        JOIN public.course_enrollments ce ON ce.course_id = c.id
        WHERE m.id = lessons.module_id AND ce.user_id = auth.uid() AND ce.is_active = true
    )
  );

-- UPDATE (Consolidação com atribuições granulares)
DROP POLICY IF EXISTS "Instructors can update assigned lessons" ON public.lessons;
CREATE POLICY lessons_update_hardened ON public.lessons
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

-- 2. HARDEN MODULES (SELECT)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS modules_select_secure ON public.modules;
CREATE POLICY modules_select_hardened ON public.modules 
  FOR SELECT USING (
    public.is_master() OR
    EXISTS (
        -- Permitir se for o DONO do curso
        SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()
    ) OR
    EXISTS (
        -- Permitir se tiver pelo menos UMA aula atribuída neste módulo
        SELECT 1 FROM public.instructor_lesson_assignments ila 
        JOIN public.lessons l ON l.id = ila.lesson_id
        WHERE l.module_id = modules.id AND ila.user_id = auth.uid()
    ) OR
    EXISTS (
        -- Permitir se for ALUNO inscrito
        SELECT 1 FROM public.course_enrollments ce 
        WHERE ce.course_id = modules.course_id AND ce.user_id = auth.uid() AND ce.is_active = true
    )
  );

-- 3. HARDEN COURSES (SELECT)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS courses_select_secure ON public.courses;
CREATE POLICY courses_select_hardened ON public.courses 
  FOR SELECT USING (
    is_public = true OR 
    public.is_master() OR
    instructor_id = auth.uid() OR
    EXISTS (
        -- Permitir se tiver pelo menos UMA aula atribuída neste curso
        SELECT 1 FROM public.instructor_lesson_assignments ila 
        JOIN public.lessons l ON l.id = ila.lesson_id
        JOIN public.modules m ON m.id = l.module_id
        WHERE m.course_id = courses.id AND ila.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.course_enrollments ce 
      WHERE ce.course_id = id AND ce.user_id = auth.uid() AND ce.is_active = true
    )
  );

-- 4. HARDEN STUDENT ANSWERS (Privacy)
-- ------------------------------------------------------------
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own answers" ON public.student_answers;
CREATE POLICY "Users can view own answers" ON public.student_answers
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Instructors can view assigned answers" ON public.student_answers;
CREATE POLICY "Instructors can view assigned answers" ON public.student_answers
    FOR SELECT USING (
        public.is_master() OR
        EXISTS (
            -- Dono do curso
            SELECT 1 FROM public.lessons l
            JOIN public.modules m ON m.id = l.module_id
            JOIN public.courses c ON c.id = m.course_id
            WHERE l.id = student_answers.lesson_id AND c.instructor_id = auth.uid()
        ) OR
        EXISTS (
            -- Atribuído granularmente
            SELECT 1 FROM public.instructor_lesson_assignments ila 
            WHERE ila.lesson_id = student_answers.lesson_id AND ila.user_id = auth.uid()
        )
    );

-- Add UPDATE policy for instructors (Grading)
DROP POLICY IF EXISTS "Instructors can grade assigned answers" ON public.student_answers;
CREATE POLICY "Instructors can grade assigned answers" ON public.student_answers
    FOR UPDATE USING (
        public.is_master() OR
        EXISTS (
            -- Dono do curso ou atribuído
            SELECT 1 FROM public.lessons l
            JOIN public.modules m ON m.id = l.module_id
            JOIN public.courses c ON c.id = m.course_id
            LEFT JOIN public.instructor_lesson_assignments ila ON ila.lesson_id = l.id AND ila.user_id = auth.uid()
            WHERE l.id = student_answers.lesson_id AND (c.instructor_id = auth.uid() OR ila.user_id IS NOT NULL)
        )
    );

-- 5. HARDEN FORUM MESSAGES (Isolation)
-- ------------------------------------------------------------
ALTER TABLE public.lesson_forum_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Forum messages are viewable by assigned users" ON public.lesson_forum_messages;
CREATE POLICY "Forum messages viewable by assigned users" ON public.lesson_forum_messages
    FOR SELECT USING (
        public.is_master() OR
        EXISTS (
            -- Aluno inscrito no curso da aula
            SELECT 1 FROM public.lessons l
            JOIN public.modules m ON m.id = l.module_id
            JOIN public.course_enrollments ce ON ce.course_id = m.course_id
            WHERE l.id = lesson_forum_messages.lesson_id AND ce.user_id = auth.uid() AND ce.is_active = true
        ) OR
        EXISTS (
            -- Instrutor dono do curso
            SELECT 1 FROM public.lessons l
            JOIN public.modules m ON m.id = l.module_id
            JOIN public.courses c ON c.id = m.course_id
            WHERE l.id = lesson_forum_messages.lesson_id AND c.instructor_id = auth.uid()
        ) OR
        EXISTS (
            -- Instrutor atribuído granularmente
            SELECT 1 FROM public.instructor_lesson_assignments ila 
            WHERE ila.lesson_id = lesson_forum_messages.lesson_id AND ila.user_id = auth.uid()
        )
    );

-- 6. INDEXES PREVENT FULL TABLE SCANS (Performance integration)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ila_user_id ON public.instructor_lesson_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ila_lesson_id ON public.instructor_lesson_assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);

NOTIFY pgrst, 'reload schema';

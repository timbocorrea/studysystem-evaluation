-- ============================================================
-- PHASE 3: FINAL PERFORMANCE OPTIMIZATION (INDEXES & QUERY SPEED)
-- ============================================================

-- 1. FOREIGN KEY INDEXES (Crucial for RLS Joins)
-- ------------------------------------------------------------
-- These avoid seq-scans during the 'EXISTS' triggers of our hardened policies
CREATE INDEX IF NOT EXISTS idx_lessons_course_id_lookup ON public.lessons(id, module_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_lesson_id ON public.student_answers(lesson_id);
CREATE INDEX IF NOT EXISTS idx_forum_messages_lesson_id ON public.lesson_forum_messages(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_combined ON public.course_enrollments(user_id, course_id, is_active);

-- 2. SORTING INDEXES (For smooth dashboard/admin loading)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_courses_created_at_desc ON public.courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_modules_position_asc ON public.modules(course_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_lessons_position_asc ON public.lessons(module_id, position ASC);

-- 3. ATTRIBUTE INDEXES (For dashboard filters)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_courses_is_public ON public.courses(is_public) WHERE is_public = true;

-- 4. VACUUM AND ANALYZE (Inform the query planner of the new routes)
-- ------------------------------------------------------------
-- Note: In managed Supabase, autovacuum is active, but we can trigger a manual re-scan if needed locally.
NOTIFY pgrst, 'reload schema';

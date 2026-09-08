-- ============================================================
-- REPAIR: SCHEMA & INSTRUCTOR QUERIES
-- ============================================================

-- 1. ENSURE student_answers columns exist for feedback/grading
-- ------------------------------------------------------------
ALTER TABLE public.student_answers
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS feedback_text TEXT,
ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

-- 2. FIX: get_pending_student_answers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pending_student_answers(p_instructor_id UUID)
RETURNS TABLE (
    user_id UUID,
    lesson_id UUID,
    block_id TEXT,
    answer_text TEXT,
    updated_at TIMESTAMPTZ,
    student_name TEXT,
    lesson_title TEXT,
    course_title TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.user_id,
        sa.lesson_id,
        sa.block_id,
        sa.answer_text,
        sa.updated_at,
        p.name as student_name,
        l.title as lesson_title,
        c.title as course_title
    FROM public.student_answers sa
    JOIN public.profiles p ON p.id = sa.user_id
    JOIN public.lessons l ON l.id = sa.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = p_instructor_id AND (role = 'MASTER' OR email = '[REDACTED_EVALUATION_IDENTITY]'))
        OR
        c.instructor_id = p_instructor_id
        OR
        EXISTS (
            SELECT 1 FROM public.instructor_lesson_assignments ila 
            WHERE ila.lesson_id = sa.lesson_id AND ila.user_id = p_instructor_id
        )
    )
    AND sa.feedback_text IS NULL
    ORDER BY sa.updated_at ASC;
END;
$$;

-- 3. FIX: get_pending_forum_messages
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pending_forum_messages(p_instructor_id UUID)
RETURNS TABLE (
    id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    image_url TEXT,
    lesson_id UUID,
    user_id UUID,
    parent_id UUID,
    is_pinned BOOLEAN,
    is_edited BOOLEAN,
    user_name TEXT,
    user_role TEXT,
    lesson_title TEXT,
    course_title TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.content,
        m.created_at,
        m.image_url,
        m.lesson_id,
        m.user_id,
        m.parent_id,
        m.is_pinned,
        m.is_edited,
        p.name as user_name,
        p.role as user_role,
        l.title as lesson_title,
        c.title as course_title
    FROM public.lesson_forum_messages m
    JOIN public.profiles p ON p.id = m.user_id
    JOIN public.lessons l ON l.id = m.lesson_id
    JOIN public.modules mod ON mod.id = l.module_id
    JOIN public.courses c ON c.id = mod.course_id
    WHERE (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = p_instructor_id AND (role = 'MASTER' OR email = '[REDACTED_EVALUATION_IDENTITY]'))
        OR
        c.instructor_id = p_instructor_id
        OR
        EXISTS (
            SELECT 1 FROM public.instructor_lesson_assignments ila 
            WHERE ila.lesson_id = m.lesson_id AND ila.user_id = p_instructor_id
        )
    )
    AND m.parent_id IS NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM public.lesson_forum_messages r
        JOIN public.profiles rp ON rp.id = r.user_id
        WHERE r.parent_id = m.id
        AND (rp.role = 'INSTRUCTOR' OR rp.role = 'MASTER')
    )
    ORDER BY m.created_at DESC;
END;
$$;

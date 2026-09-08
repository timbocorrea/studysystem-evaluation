
-- Function to get pending forum messages for an instructor
-- Pending = Thread starters (parent_id IS NULL) that have NO reply from an INSTRUCTOR or MASTER
CREATE OR REPLACE FUNCTION get_pending_forum_messages(p_instructor_id UUID)
RETURNS TABLE (
    id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    user_id UUID,
    lesson_id UUID,
    parent_id UUID,
    image_url TEXT,
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
        m.user_id,
        m.lesson_id,
        m.parent_id,
        m.image_url,
        m.is_pinned,
        m.is_edited,
        p.name as user_name,
        p.role::TEXT as user_role,
        l.title as lesson_title,
        c.title as course_title
    FROM public.lesson_forum_messages m
    JOIN public.profiles p ON p.id = m.user_id
    JOIN public.lessons l ON l.id = m.lesson_id
    JOIN public.modules mod ON mod.id = l.module_id
    JOIN public.courses c ON c.id = mod.course_id
    WHERE c.instructor_id = p_instructor_id
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

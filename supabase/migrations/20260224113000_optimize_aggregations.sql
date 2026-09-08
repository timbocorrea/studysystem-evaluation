
-- RPC to fetch aggregated dashboard stats for a user
-- Returns JSON with total lessons, avg quiz score, and total study time
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_completed_lessons INTEGER;
    v_avg_quiz_score NUMERIC;
    v_total_study_time_seconds INTEGER;
    v_xp_total INTEGER;
    v_current_level INTEGER;
BEGIN
    -- Check permissions: User can only fetch their own stats
    -- (Admins could fetch anyone's but for now we enforce self-only in this RPC)
    IF auth.uid() <> p_user_id AND NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'INSTRUCTOR'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Completed lessons count
    SELECT count(*) INTO v_completed_lessons
    FROM public.lesson_progress
    WHERE user_id = p_user_id AND is_completed = true;

    -- Average quiz score (passed only)
    SELECT COALESCE(avg(score), 0) INTO v_avg_quiz_score
    FROM public.quiz_attempts
    WHERE user_id = p_user_id AND passed = true;

    -- Total Study Time (from granular system)
    SELECT COALESCE(sum(total_duration_seconds), 0) INTO v_total_study_time_seconds
    FROM public.audit_logs
    WHERE user_id = p_user_id;

    -- Current XP and Level from profile
    SELECT xp_total, current_level INTO v_xp_total, v_current_level
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'completed_lessons', v_completed_lessons,
        'average_quiz_score', ROUND(v_avg_quiz_score, 1),
        'total_study_time_seconds', v_total_study_time_seconds,
        'xp_total', COALESCE(v_xp_total, 0),
        'current_level', COALESCE(v_current_level, 1)
    );
END;
$$;

-- 1. Function to calculate Leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_timeframe TEXT)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    xp BIGINT,
    level INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
BEGIN
    IF p_timeframe = 'weekly' THEN
        v_start_date := date_trunc('week', now());
    ELSIF p_timeframe = 'monthly' THEN
        v_start_date := date_trunc('month', now());
    ELSE
        v_start_date := '1900-01-01'::timestamptz;
    END IF;

    IF p_timeframe = 'all-time' THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.avatar_url,
            p.xp_total::BIGINT as xp,
            p.current_level as level
        FROM public.profiles p
        WHERE p.role = 'STUDENT'
        ORDER BY p.xp_total DESC
        LIMIT 50;
    ELSE
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.avatar_url,
            COALESCE(SUM(h.amount), 0)::BIGINT as xp,
            p.current_level as level
        FROM public.profiles p
        LEFT JOIN public.xp_history h ON h.user_id = p.id AND h.created_at >= v_start_date
        WHERE p.role = 'STUDENT'
        GROUP BY p.id, p.name, p.avatar_url, p.current_level
        HAVING COALESCE(SUM(h.amount), 0) > 0
        ORDER BY xp DESC
        LIMIT 50;
    END IF;
END;
$$;

-- 2. Function to grant achievement and notify
CREATE OR REPLACE FUNCTION public.grant_achievement(p_user_id UUID, p_achievement_id TEXT, p_title TEXT, p_message TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert into user_achievements
    INSERT INTO public.user_achievements (user_id, achievement_id, date_earned)
    VALUES (p_user_id, p_achievement_id, now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    -- Create notification
    IF FOUND THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (p_user_id, 'Conquista Desbloqueada: ' || p_title, p_message, 'award');
    END IF;
END;
$$;

-- 3. Trigger for Level Up notification
-- This can be added to the existing profiles table logic
CREATE OR REPLACE FUNCTION public.handle_profile_level_up()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_level > OLD.current_level THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (NEW.id, '🚀 LEVEL UP!', 'Parabéns! Você alcançou o nível ' || NEW.current_level || '!', 'award');
        
        -- Check for level-based achievements
        IF NEW.current_level = 5 THEN
            PERFORM public.grant_achievement(NEW.id, 'level-5', 'Mestre do Conhecimento', 'Respeito! Você atingiu o Nível 5.');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_level_up ON public.profiles;
CREATE TRIGGER on_profile_level_up
    AFTER UPDATE OF current_level ON public.profiles
    FOR EACH ROW
    WHEN (NEW.current_level > OLD.current_level)
    EXECUTE FUNCTION public.handle_profile_level_up();

-- 4. Achievement logic for Lesson Completion
CREATE OR REPLACE FUNCTION public.check_lesson_achievements()
RETURNS TRIGGER AS $$
DECLARE
    v_completed_count INTEGER;
BEGIN
    IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
        -- First Lesson Achievement
        SELECT count(*) INTO v_completed_count FROM public.lesson_progress WHERE user_id = NEW.user_id AND is_completed = true;
        
        IF v_completed_count = 1 THEN
            PERFORM public.grant_achievement(NEW.user_id, 'first-lesson', 'Primeiro Passo', 'Você concluiu sua primeira aula no sistema!');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_lesson_completed_achievement ON public.lesson_progress;
CREATE TRIGGER on_lesson_completed_achievement
    AFTER INSERT OR UPDATE ON public.lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.check_lesson_achievements();

-- Migration: 20260311203000_fix_block_id_type_to_text.sql
-- Description: Fixes type mismatch for block IDs (string on frontend, UUID on backend)

-- 1. Alter the column type in lesson_progress
ALTER TABLE public.lesson_progress 
ALTER COLUMN last_accessed_block_id TYPE TEXT;

-- 2. Update the RPC to accept TEXT for p_last_block_id
-- We drop first because changing parameter types creates a different signature
DROP FUNCTION IF EXISTS public.update_lesson_progress_secure(UUID, INTEGER, BOOLEAN, UUID);

CREATE OR REPLACE FUNCTION public.update_lesson_progress_secure(
  p_lesson_id UUID,
  p_watched_seconds INTEGER,
  p_is_completed BOOLEAN,
  p_last_block_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_was_completed BOOLEAN;
  v_lesson_duration INTEGER;
  v_video_progress INTEGER;
  v_lesson_title TEXT;
  v_xp_reward INTEGER := 150;
  v_xp_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Obter dados da aula
  SELECT duration_seconds, title INTO v_lesson_duration, v_lesson_title 
  FROM public.lessons WHERE id = p_lesson_id;
  
  IF NOT FOUND THEN
     RETURN jsonb_build_object('success', false, 'message', 'Lesson not found');
  END IF;

  -- Calcular progresso do vídeo
  v_lesson_duration := COALESCE(v_lesson_duration, 0);
  IF v_lesson_duration > 0 THEN
    v_video_progress := LEAST(100, (p_watched_seconds::FLOAT / v_lesson_duration::FLOAT * 100)::INTEGER);
  ELSE
    IF p_watched_seconds > 0 THEN v_video_progress := 100; ELSE v_video_progress := 0; END IF;
  END IF;

  -- Verificar estado anterior
  SELECT is_completed INTO v_was_completed
  FROM public.lesson_progress 
  WHERE user_id = v_user_id AND lesson_id = p_lesson_id;

  v_was_completed := COALESCE(v_was_completed, false);

  -- UPSERT no progresso
  INSERT INTO public.lesson_progress (
    user_id, lesson_id, watched_seconds, is_completed, last_accessed_block_id, video_progress, updated_at
  )
  VALUES (
    v_user_id, p_lesson_id, p_watched_seconds, p_is_completed, p_last_block_id, v_video_progress, NOW()
  )
  ON CONFLICT (user_id, lesson_id) 
  DO UPDATE SET 
    watched_seconds = EXCLUDED.watched_seconds,
    is_completed = CASE WHEN public.lesson_progress.is_completed THEN true ELSE EXCLUDED.is_completed END,
    last_accessed_block_id = COALESCE(EXCLUDED.last_accessed_block_id, public.lesson_progress.last_accessed_block_id),
    video_progress = EXCLUDED.video_progress,
    updated_at = NOW();

  -- Se marcou como completo AGORA e NÃO estava antes -> DAR XP
  IF p_is_completed AND NOT v_was_completed THEN
    v_xp_result := public.add_secure_xp(
      v_user_id, 
      v_xp_reward, 
      'LESSON_COMPLETE', 
      'Conclusão da aula: ' || v_lesson_title
    );
    
    RETURN jsonb_build_object(
      'success', true, 
      'status', 'COMPLETED_NOW',
      'xp_awarded', v_xp_reward,
      'xp_data', v_xp_result
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true, 
      'status', 'UPDATED',
      'xp_awarded', 0
    );
  END IF;

END;
$$;

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';

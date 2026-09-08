-- StudySystem — gamificação server-owned e fechamento de DML direto do cliente.

BEGIN;

CREATE TABLE IF NOT EXISTS public.xp_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL CHECK (reward_type IN ('LESSON_COMPLETE', 'MODULE_COMPLETE')),
  reference_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  source text NOT NULL CHECK (source IN ('verified_claim', 'legacy_completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_type, reference_id)
);

INSERT INTO public.xp_reward_claims (user_id, reward_type, reference_id, amount, source)
SELECT lp.user_id, 'LESSON_COMPLETE', lp.lesson_id, 150, 'legacy_completed'
FROM public.lesson_progress lp
WHERE lp.is_completed = true
ON CONFLICT (user_id, reward_type, reference_id) DO NOTHING;

INSERT INTO public.xp_reward_claims (user_id, reward_type, reference_id, amount, source)
SELECT lp.user_id, 'MODULE_COMPLETE', m.id, 500, 'legacy_completed'
FROM public.modules m
JOIN public.lessons l
  ON l.module_id = m.id
 AND COALESCE(l.is_active, true) = true
JOIN public.lesson_progress lp
  ON lp.lesson_id = l.id
 AND lp.is_completed = true
GROUP BY lp.user_id, m.id
HAVING COUNT(DISTINCT l.id) = (
  SELECT COUNT(*)
  FROM public.lessons active_lesson
  WHERE active_lesson.module_id = m.id
    AND COALESCE(active_lesson.is_active, true) = true
)
ON CONFLICT (user_id, reward_type, reference_id) DO NOTHING;

ALTER TABLE public.xp_reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_reward_claims FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.xp_reward_claims FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lesson_completion_is_eligible(
  p_user_id uuid,
  p_lesson_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_course_id uuid;
  v_duration integer;
  v_content_blocks jsonb;
  v_video_required numeric := 90;
  v_text_required numeric := 0;
  v_progress record;
  v_required_pdfs jsonb := '[]'::jsonb;
  v_required_audios jsonb := '[]'::jsonb;
  v_required_materials jsonb := '[]'::jsonb;
  v_text_total integer;
  v_text_read integer;
  v_video_progress numeric;
BEGIN
  IF p_user_id IS NULL OR p_lesson_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT m.course_id, l.duration_seconds, COALESCE(l.content_blocks, '[]'::jsonb)
  INTO v_course_id, v_duration, v_content_blocks
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = p_lesson_id
    AND COALESCE(l.is_active, true) = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = v_course_id
      AND (
        COALESCE(c.is_public, false) = true
        OR EXISTS (
          SELECT 1
          FROM public.course_enrollments ce
          WHERE ce.course_id = c.id
            AND ce.user_id = p_user_id
            AND ce.is_active = true
        )
      )
  ) THEN
    RETURN false;
  END IF;

  SELECT lp.*
  INTO v_progress
  FROM public.lesson_progress lp
  WHERE lp.user_id = p_user_id
    AND lp.lesson_id = p_lesson_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT
    COALESCE(lpr.video_required_percent, 90),
    COALESCE(lpr.text_blocks_required_percent, 0),
    COALESCE(to_jsonb(lpr.required_pdfs), '[]'::jsonb),
    COALESCE(to_jsonb(lpr.required_audios), '[]'::jsonb),
    COALESCE(to_jsonb(lpr.required_materials), '[]'::jsonb)
  INTO
    v_video_required,
    v_text_required,
    v_required_pdfs,
    v_required_audios,
    v_required_materials
  FROM public.lesson_progress_requirements lpr
  WHERE lpr.lesson_id = p_lesson_id;

  IF NOT FOUND THEN
    v_video_required := 90;
    v_text_required := 0;
    v_required_pdfs := '[]'::jsonb;
    v_required_audios := '[]'::jsonb;
    v_required_materials := '[]'::jsonb;
  END IF;

  v_video_progress := COALESCE(
    v_progress.video_progress,
    CASE
      WHEN COALESCE(v_duration, 0) > 0
        THEN LEAST(100, (COALESCE(v_progress.watched_seconds, 0)::numeric / v_duration) * 100)
      WHEN COALESCE(v_progress.watched_seconds, 0) > 0 THEN 100
      ELSE 0
    END
  );

  IF COALESCE(v_duration, 0) > 0 AND v_video_progress < v_video_required THEN
    RETURN false;
  END IF;

  SELECT COUNT(*)
  INTO v_text_total
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(COALESCE(v_content_blocks, '[]'::jsonb)) = 'array'
        THEN v_content_blocks
      ELSE '[]'::jsonb
    END
  ) AS block
  WHERE COALESCE(block ->> 'type', 'text') IN ('text', 'text_answer');
  v_text_read := jsonb_array_length(COALESCE(to_jsonb(v_progress.text_blocks_read), '[]'::jsonb));
  IF v_text_required > 0
     AND v_text_total > 0
     AND ((v_text_read::numeric / v_text_total::numeric) * 100) < v_text_required THEN
    RETURN false;
  END IF;

  IF NOT (COALESCE(to_jsonb(v_progress.pdfs_viewed), '[]'::jsonb) @> v_required_pdfs) THEN
    RETURN false;
  END IF;

  IF NOT (COALESCE(to_jsonb(v_progress.audios_played), '[]'::jsonb) @> v_required_audios) THEN
    RETURN false;
  END IF;

  IF NOT (COALESCE(to_jsonb(v_progress.materials_accessed), '[]'::jsonb) @> v_required_materials) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.quizzes q WHERE q.lesson_id = p_lesson_id
  ) AND EXISTS (
    SELECT 1
    FROM public.quizzes q
    WHERE q.lesson_id = p_lesson_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.quiz_attempts qa
        WHERE qa.quiz_id = q.id
          AND qa.user_id = p_user_id
          AND qa.passed = true
      )
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.module_completion_is_eligible(
  p_user_id uuid,
  p_module_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.module_id = p_module_id
      AND COALESCE(l.is_active, true) = true
      AND (
        COALESCE(c.is_public, false) = true
        OR EXISTS (
          SELECT 1
          FROM public.course_enrollments ce
          WHERE ce.course_id = c.id
            AND ce.user_id = p_user_id
            AND ce.is_active = true
        )
      )
    GROUP BY l.module_id
    HAVING COUNT(*) = COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.lesson_progress lp
        WHERE lp.user_id = p_user_id
          AND lp.lesson_id = l.id
          AND lp.is_completed = true
      )
    )
    AND COUNT(*) = COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.xp_reward_claims xrc
        WHERE xrc.user_id = p_user_id
          AND xrc.reward_type = 'LESSON_COMPLETE'
          AND xrc.reference_id = l.id
      )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.add_secure_xp(
  p_user_id uuid,
  p_amount integer,
  p_action_type text,
  p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_old_xp integer;
  v_new_xp integer;
  v_old_level integer;
  v_new_level integer;
BEGIN
  IF p_user_id IS NULL OR p_action_type NOT IN ('LESSON_COMPLETE', 'MODULE_COMPLETE') THEN
    RAISE EXCEPTION 'Invalid XP action';
  END IF;

  IF (p_action_type = 'LESSON_COMPLETE' AND p_amount <> 150)
     OR (p_action_type = 'MODULE_COMPLETE' AND p_amount <> 500) THEN
    RAISE EXCEPTION 'Invalid XP reward amount';
  END IF;

  IF auth.uid() IS NOT NULL
     AND auth.uid() <> p_user_id
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'XP actor mismatch';
  END IF;

  SELECT COALESCE(xp_total, 0), COALESCE(current_level, 1)
  INTO v_old_xp, v_old_level
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_new_xp := v_old_xp + p_amount;
  v_new_level := 1 + floor(v_new_xp::numeric / 1000)::integer;

  PERFORM set_config('studysystem.internal_write', 'true', true);

  UPDATE public.profiles
  SET xp_total = v_new_xp,
      current_level = v_new_level,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.xp_history (user_id, amount, action_type, description)
  VALUES (p_user_id, p_amount, p_action_type, p_description);

  RETURN jsonb_build_object(
    'success', true,
    'xp_gained', p_amount,
    'new_xp', v_new_xp,
    'level_up', v_new_level > v_old_level,
    'new_level', v_new_level
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_completion_xp(
  p_reward_type text,
  p_reference_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_amount integer;
  v_description text;
  v_claim_id uuid;
  v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR auth.role() NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_actor_id AND p.role = 'STUDENT'
  ) THEN
    RAISE EXCEPTION 'Only STUDENT accounts can claim completion XP';
  END IF;

  IF p_reward_type = 'LESSON_COMPLETE' THEN
    v_amount := 150;
    SELECT l.title INTO v_description
    FROM public.lessons l
    WHERE l.id = p_reference_id;
    IF v_description IS NULL OR NOT public.lesson_completion_is_eligible(v_actor_id, p_reference_id) THEN
      RETURN jsonb_build_object('success', false, 'reason', 'LESSON_NOT_ELIGIBLE');
    END IF;
    UPDATE public.lesson_progress
    SET is_completed = true, updated_at = now()
    WHERE user_id = v_actor_id AND lesson_id = p_reference_id;
  ELSIF p_reward_type = 'MODULE_COMPLETE' THEN
    v_amount := 500;
    SELECT m.title INTO v_description
    FROM public.modules m
    WHERE m.id = p_reference_id;
    IF v_description IS NULL OR NOT public.module_completion_is_eligible(v_actor_id, p_reference_id) THEN
      RETURN jsonb_build_object('success', false, 'reason', 'MODULE_NOT_ELIGIBLE');
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported reward type';
  END IF;

  INSERT INTO public.xp_reward_claims (user_id, reward_type, reference_id, amount, source)
  VALUES (v_actor_id, p_reward_type, p_reference_id, v_amount, 'verified_claim')
  ON CONFLICT (user_id, reward_type, reference_id) DO NOTHING
  RETURNING id INTO v_claim_id;

  IF v_claim_id IS NULL THEN
    SELECT jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'awarded', false,
      'xp_awarded', 0,
      'xp_gained', 0,
      'new_xp', COALESCE(p.xp_total, 0),
      'level_up', false,
      'new_level', COALESCE(p.current_level, 1)
    )
    INTO v_result
    FROM public.profiles p
    WHERE p.id = v_actor_id;
    RETURN v_result;
  END IF;

  v_result := public.add_secure_xp(
    v_actor_id,
    v_amount,
    p_reward_type,
    CASE p_reward_type
      WHEN 'LESSON_COMPLETE' THEN 'Conclusão da aula: ' || v_description
      ELSE 'Conclusão do módulo: ' || v_description
    END
  );

  RETURN v_result || jsonb_build_object(
    'claim_id', v_claim_id,
    'awarded', true,
    'xp_awarded', v_amount
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_lesson_progress_secure(
  p_lesson_id uuid,
  p_watched_seconds integer,
  p_is_completed boolean,
  p_last_block_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_course_id uuid;
  v_duration integer;
  v_old_watched integer := 0;
  v_old_completed boolean := false;
  v_watched integer;
  v_video_progress integer;
  v_completed boolean;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT m.course_id, l.duration_seconds
  INTO v_course_id, v_duration
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = p_lesson_id
    AND COALESCE(l.is_active, true) = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = v_course_id
      AND (
        COALESCE(c.is_public, false) = true
        OR EXISTS (
          SELECT 1 FROM public.course_enrollments ce
          WHERE ce.course_id = c.id
            AND ce.user_id = v_actor_id
            AND ce.is_active = true
        )
      )
  ) THEN
    RAISE EXCEPTION 'Access denied to lesson';
  END IF;

  SELECT COALESCE(lp.watched_seconds, 0), COALESCE(lp.is_completed, false)
  INTO v_old_watched, v_old_completed
  FROM public.lesson_progress lp
  WHERE lp.user_id = v_actor_id
    AND lp.lesson_id = p_lesson_id;

  v_watched := GREATEST(0, COALESCE(p_watched_seconds, 0));
  IF COALESCE(v_duration, 0) > 0 THEN
    v_watched := LEAST(v_watched, v_duration);
    v_video_progress := LEAST(100, floor((v_watched::numeric / v_duration) * 100)::integer);
  ELSE
    v_video_progress := CASE WHEN v_watched > 0 THEN 100 ELSE 0 END;
  END IF;
  v_watched := GREATEST(v_old_watched, v_watched);

  INSERT INTO public.lesson_progress (
    user_id,
    lesson_id,
    watched_seconds,
    is_completed,
    last_accessed_block_id,
    video_progress,
    updated_at
  )
  VALUES (
    v_actor_id,
    p_lesson_id,
    v_watched,
    v_old_completed,
    p_last_block_id,
    v_video_progress,
    now()
  )
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    watched_seconds = GREATEST(public.lesson_progress.watched_seconds, EXCLUDED.watched_seconds),
    is_completed = public.lesson_progress.is_completed,
    last_accessed_block_id = COALESCE(EXCLUDED.last_accessed_block_id, public.lesson_progress.last_accessed_block_id),
    video_progress = GREATEST(COALESCE(public.lesson_progress.video_progress, 0), EXCLUDED.video_progress),
    updated_at = now();

  v_completed := v_old_completed;
  -- p_is_completed permanece apenas por compatibilidade de assinatura;
  -- a conclusão efetiva é sempre decidida pelos requisitos persistidos.
  PERFORM p_is_completed;
  IF public.lesson_completion_is_eligible(v_actor_id, p_lesson_id) THEN
    UPDATE public.lesson_progress
    SET is_completed = true, updated_at = now()
    WHERE user_id = v_actor_id AND lesson_id = p_lesson_id;
    v_completed := true;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_completed', v_completed,
    'watched_seconds', v_watched,
    'video_progress', v_video_progress
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_lesson_progress_event(
  p_lesson_id uuid,
  p_event_type text,
  p_reference_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_course_id uuid;
  v_completed boolean := false;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_event_type NOT IN ('TEXT_BLOCK', 'PDF', 'AUDIO', 'MATERIAL')
     OR NULLIF(trim(p_reference_id), '') IS NULL
     OR char_length(trim(p_reference_id)) > 200 THEN
    RAISE EXCEPTION 'Invalid lesson progress event';
  END IF;

  SELECT m.course_id INTO v_course_id
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = p_lesson_id
    AND COALESCE(l.is_active, true) = true;

  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = v_course_id
      AND (
        COALESCE(c.is_public, false) = true
        OR EXISTS (
          SELECT 1 FROM public.course_enrollments ce
          WHERE ce.course_id = c.id
            AND ce.user_id = v_actor_id
            AND ce.is_active = true
        )
      )
  ) THEN
    RAISE EXCEPTION 'Access denied to lesson';
  END IF;

  INSERT INTO public.lesson_progress (user_id, lesson_id, updated_at)
  VALUES (v_actor_id, p_lesson_id, now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET updated_at = now();

  IF p_event_type = 'TEXT_BLOCK' THEN
    UPDATE public.lesson_progress
    SET text_blocks_read = ARRAY(
          SELECT DISTINCT item
          FROM unnest(COALESCE(public.lesson_progress.text_blocks_read, ARRAY[]::text[]) || ARRAY[p_reference_id]) AS item
        ),
        updated_at = now()
    WHERE user_id = v_actor_id AND lesson_id = p_lesson_id;
  ELSIF p_event_type = 'PDF' THEN
    UPDATE public.lesson_progress
    SET pdfs_viewed = ARRAY(
          SELECT DISTINCT item
          FROM unnest(COALESCE(public.lesson_progress.pdfs_viewed, ARRAY[]::text[]) || ARRAY[p_reference_id]) AS item
        ),
        updated_at = now()
    WHERE user_id = v_actor_id AND lesson_id = p_lesson_id;
  ELSIF p_event_type = 'AUDIO' THEN
    UPDATE public.lesson_progress
    SET audios_played = ARRAY(
          SELECT DISTINCT item
          FROM unnest(COALESCE(public.lesson_progress.audios_played, ARRAY[]::text[]) || ARRAY[p_reference_id]) AS item
        ),
        updated_at = now()
    WHERE user_id = v_actor_id AND lesson_id = p_lesson_id;
  ELSE
    UPDATE public.lesson_progress
    SET materials_accessed = ARRAY(
          SELECT DISTINCT item
          FROM unnest(COALESCE(public.lesson_progress.materials_accessed, ARRAY[]::text[]) || ARRAY[p_reference_id]) AS item
        ),
        updated_at = now()
    WHERE user_id = v_actor_id AND lesson_id = p_lesson_id;
  END IF;

  IF public.lesson_completion_is_eligible(v_actor_id, p_lesson_id) THEN
    UPDATE public.lesson_progress
    SET is_completed = true, updated_at = now()
    WHERE user_id = v_actor_id AND lesson_id = p_lesson_id;
    v_completed := true;
  END IF;

  RETURN jsonb_build_object('success', true, 'is_completed', v_completed);
END;
$function$;

DO $drop_progress_write_policies$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('lesson_progress', 'quiz_attempts', 'xp_history')
      AND cmd <> 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  END LOOP;
END;
$drop_progress_write_policies$;

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.lesson_progress FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.quiz_attempts FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.xp_history FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.lesson_progress TO authenticated;
GRANT SELECT ON TABLE public.quiz_attempts TO authenticated;
GRANT SELECT ON TABLE public.xp_history TO authenticated;

DROP POLICY IF EXISTS xp_history_select_self_or_staff ON public.xp_history;
CREATE POLICY xp_history_select_self_or_staff
ON public.xp_history
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_instructor()
);

REVOKE ALL ON FUNCTION public.lesson_completion_is_eligible(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.module_completion_is_eligible(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_secure_xp(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_completion_xp(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_lesson_progress_secure(uuid, integer, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_lesson_progress_event(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.add_secure_xp(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_completion_xp(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_lesson_progress_secure(uuid, integer, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_lesson_progress_event(uuid, text, text) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- StudySystem — conquistas server-owned e compatibilidade de leitura legada.

BEGIN;

-- O catálogo é append-only: não remove nem reescreve conquistas existentes.
INSERT INTO public.achievements (id, title, description, icon)
VALUES
  ('module-master', 'Mestre do Módulo', 'Você completou um módulo inteiro!', 'fa-crown'),
  ('course-complete', 'Conquistador do Curso', 'Você completou todas as aulas deste curso!', 'fa-trophy'),
  ('xp-1000', 'Aprendiz Dedicado', 'Você alcançou 1.000 XP acumulados!', 'fa-bolt'),
  ('xp-5000', 'Veterano do Estudo', 'Você alcançou 5.000 XP acumulados!', 'fa-award'),
  ('level-5', 'Mestre do Conhecimento', 'Respeito! Você atingiu o Nível 5.', 'fa-brain')
ON CONFLICT (id) DO NOTHING;

-- Conquistas não podem ser escolhidas nem gravadas diretamente pelo cliente.
DROP POLICY IF EXISTS "Users can insert their own achievements"
ON public.user_achievements;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.user_achievements
FROM PUBLIC, anon, authenticated;

-- A leitura autenticada usada pelo frontend legado permanece disponível.
GRANT SELECT ON TABLE public.user_achievements TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_server_owned_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := NEW.user_id;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- A primeira aula precisa ter uma recompensa de aula server-owned.
  IF EXISTS (
    SELECT 1
    FROM public.xp_reward_claims xrc
    WHERE xrc.user_id = v_user_id
      AND xrc.reward_type = 'LESSON_COMPLETE'
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, date_earned)
    VALUES (v_user_id, 'first-lesson', now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Um módulo é elegível somente quando todas as aulas ativas têm
  -- progresso concluído e uma recompensa de aula server-owned.
  IF EXISTS (
    SELECT 1
    FROM public.modules m
    WHERE EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.module_id = m.id
        AND COALESCE(l.is_active, true) = true
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.module_id = m.id
        AND COALESCE(l.is_active, true) = true
        AND (
          NOT EXISTS (
            SELECT 1
            FROM public.lesson_progress lp
            WHERE lp.user_id = v_user_id
              AND lp.lesson_id = l.id
              AND lp.is_completed = true
          )
          OR NOT EXISTS (
            SELECT 1
            FROM public.xp_reward_claims xrc
            WHERE xrc.user_id = v_user_id
              AND xrc.reward_type = 'LESSON_COMPLETE'
              AND xrc.reference_id = l.id
          )
        )
    )
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, date_earned)
    VALUES (v_user_id, 'module-master', now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Um curso é elegível somente quando todas as suas aulas ativas têm
  -- progresso concluído e uma recompensa de aula server-owned.
  IF EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE EXISTS (
      SELECT 1
      FROM public.modules m
      JOIN public.lessons l ON l.module_id = m.id
      WHERE m.course_id = c.id
        AND COALESCE(l.is_active, true) = true
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.modules m
      JOIN public.lessons l ON l.module_id = m.id
      WHERE m.course_id = c.id
        AND COALESCE(l.is_active, true) = true
        AND (
          NOT EXISTS (
            SELECT 1
            FROM public.lesson_progress lp
            WHERE lp.user_id = v_user_id
              AND lp.lesson_id = l.id
              AND lp.is_completed = true
          )
          OR NOT EXISTS (
            SELECT 1
            FROM public.xp_reward_claims xrc
            WHERE xrc.user_id = v_user_id
              AND xrc.reward_type = 'LESSON_COMPLETE'
              AND xrc.reference_id = l.id
          )
        )
    )
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, date_earned)
    VALUES (v_user_id, 'course-complete', now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- XP e nível são derivados de estado server-owned, nunca do payload do cliente.
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_user_id
      AND COALESCE(p.xp_total, 0) >= 1000
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, date_earned)
    VALUES (v_user_id, 'xp-1000', now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_user_id
      AND COALESCE(p.xp_total, 0) >= 5000
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, date_earned)
    VALUES (v_user_id, 'xp-5000', now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_user_id
      AND COALESCE(p.current_level, 1) >= 5
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, date_earned)
    VALUES (v_user_id, 'level-5', now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_server_owned_achievements() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_server_owned_achievements() TO service_role;

DROP TRIGGER IF EXISTS trg_sync_server_owned_achievements ON public.xp_history;
CREATE TRIGGER trg_sync_server_owned_achievements
AFTER INSERT ON public.xp_history
FOR EACH ROW
EXECUTE FUNCTION public.sync_server_owned_achievements();

-- Se o caminho legado existir em algum ambiente, ele também não pode ser
-- chamado diretamente pelo cliente. O remoto atual não possui essa função.
DO $revoke_legacy_grant_achievement$
BEGIN
  IF to_regprocedure('public.grant_achievement(uuid,text,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.grant_achievement(uuid, text, text, text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.grant_achievement(uuid, text, text, text) TO service_role';
  END IF;
END;
$revoke_legacy_grant_achievement$;

-- Preserva toda a proteção existente e neutraliza somente achievements em
-- INSERT/UPDATE direto de STUDENT/INSTRUCTOR. MASTER/service_role e writes
-- internos permanecem autorizados pelo contrato anterior.
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF auth.role() = 'service_role'
     OR public.is_master()
     OR current_setting('studysystem.internal_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'STUDENT';
    NEW.xp_total := COALESCE(NEW.xp_total, 0);
    NEW.current_level := COALESCE(NEW.current_level, 1);
    NEW.achievements := '[]'::jsonb;
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.approval_status := OLD.approval_status;
  NEW.xp_total := OLD.xp_total;
  NEW.current_level := OLD.current_level;
  NEW.achievements := OLD.achievements;
  RETURN NEW;
END;
$function$;

COMMIT;

NOTIFY pgrst, 'reload schema';

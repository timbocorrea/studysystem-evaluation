BEGIN;

-- EXPAND: publica writers protegidos sem retirar o caminho legado da main.
-- A revogacao final do INSERT pertence a migracao CONTRACT posterior.

-- Notificações são lidas e gerenciadas pelo próprio destinatário. A criação
-- deixa de ser uma operação arbitrária exposta pelo Data API.
-- O destinatário do fórum é derivado da mensagem pai. O cliente só informa
-- a resposta já criada; sender_id, target e link são resolvidos no servidor.
CREATE OR REPLACE FUNCTION public.notify_forum_reply(p_reply_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_reply_user_id uuid;
  v_lesson_id uuid;
  v_parent_id uuid;
  v_parent_user_id uuid;
  v_parent_content text;
  v_course_id uuid;
  v_sender_name text;
  v_excerpt text;
  v_link text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para notificar uma resposta do fórum'
      USING ERRCODE = '42501';
  END IF;

  SELECT m.user_id, m.lesson_id, m.parent_id
  INTO v_reply_user_id, v_lesson_id, v_parent_id
  FROM public.lesson_forum_messages AS m
  WHERE m.id = p_reply_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resposta do fórum não encontrada'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_reply_user_id IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'A resposta do fórum não pertence ao usuário autenticado'
      USING ERRCODE = '42501';
  END IF;

  IF v_parent_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.can_access_lesson_forum(v_lesson_id) THEN
    RAISE EXCEPTION 'Usuário sem acesso ao fórum da aula'
      USING ERRCODE = '42501';
  END IF;

  SELECT parent_message.user_id,
         parent_message.content,
         module_record.course_id
  INTO v_parent_user_id, v_parent_content, v_course_id
  FROM public.lesson_forum_messages AS parent_message
  JOIN public.lessons AS lesson_record
    ON lesson_record.id = parent_message.lesson_id
  JOIN public.modules AS module_record
    ON module_record.id = lesson_record.module_id
  WHERE parent_message.id = v_parent_id
    AND parent_message.lesson_id = v_lesson_id;

  IF NOT FOUND OR v_parent_user_id IS NULL OR v_course_id IS NULL THEN
    RAISE EXCEPTION 'Mensagem pai ou contexto da aula não encontrado'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_parent_user_id = v_caller_id THEN
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(btrim(p.name), ''), 'Alguém')
  INTO v_sender_name
  FROM public.profiles AS p
  WHERE p.id = v_caller_id;

  v_sender_name := COALESCE(v_sender_name, 'Alguém');
  v_excerpt := left(COALESCE(v_parent_content, ''), 40);
  IF char_length(COALESCE(v_parent_content, '')) > 40 THEN
    v_excerpt := v_excerpt || '...';
  END IF;

  v_link := format(
    '/course/%s/lesson/%s#forum-%s',
    v_course_id,
    v_lesson_id,
    p_reply_id
  );

  INSERT INTO public.notifications (
    user_id,
    sender_id,
    title,
    message,
    type,
    link
  )
  SELECT
    v_parent_user_id,
    v_caller_id,
    'Resposta no Fórum',
    format('%s respondeu ao seu comentário: "%s"', v_sender_name, v_excerpt),
    'forum_reply',
    v_link
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.notifications AS existing_notification
    WHERE existing_notification.user_id = v_parent_user_id
      AND existing_notification.sender_id = v_caller_id
      AND existing_notification.type = 'forum_reply'
      AND existing_notification.link = v_link
  );
END;
$function$;

-- O instrutor envia somente para estudantes matriculados em curso próprio ou
-- em curso no qual possui atribuição de staff. O sender é auth.uid().
CREATE OR REPLACE FUNCTION public.send_instructor_notifications(
  p_recipient_ids uuid[],
  p_title text,
  p_message text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_inserted_count integer;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para enviar notificações'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_instructor() THEN
    RAISE EXCEPTION 'Somente instrutores autorizados podem enviar notificações'
      USING ERRCODE = '42501';
  END IF;

  IF COALESCE(length(btrim(p_title)), 0) = 0
     OR COALESCE(length(btrim(p_message)), 0) = 0 THEN
    RAISE EXCEPTION 'Título e mensagem são obrigatórios'
      USING ERRCODE = '22023';
  END IF;

  IF p_recipient_ids IS NULL OR cardinality(p_recipient_ids) = 0 THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT DISTINCT recipient_id
      FROM unnest(p_recipient_ids) AS requested(recipient_id)
    ) AS requested_targets
    WHERE requested_targets.recipient_id IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM public.profiles AS target_profile
         WHERE target_profile.id = requested_targets.recipient_id
           AND target_profile.role = 'STUDENT'
           AND EXISTS (
             SELECT 1
             FROM public.course_enrollments AS target_enrollment
             JOIN public.courses AS target_course
               ON target_course.id = target_enrollment.course_id
             WHERE target_enrollment.user_id = target_profile.id
               AND target_enrollment.is_active = true
               AND (
                 target_course.instructor_id = v_caller_id
                 OR EXISTS (
                   SELECT 1
                   FROM public.course_enrollments AS staff_enrollment
                   WHERE staff_enrollment.course_id = target_course.id
                     AND staff_enrollment.user_id = v_caller_id
                     AND staff_enrollment.is_active = true
                 )
               )
           )
       )
  ) THEN
    RAISE EXCEPTION 'Um ou mais destinatários estão fora do escopo do instrutor'
      USING ERRCODE = '42501';
  END IF;

  WITH requested_targets AS (
    SELECT DISTINCT recipient_id
    FROM unnest(p_recipient_ids) AS requested(recipient_id)
  )
  INSERT INTO public.notifications (user_id, sender_id, title, message, type)
  SELECT recipient_id, v_caller_id, p_title, p_message, 'system'
  FROM requested_targets;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$function$;

-- O envio administrativo não recebe sender_id confiável do cliente. A role
-- e a identidade do remetente são sempre determinadas por auth.uid().
CREATE OR REPLACE FUNCTION public.send_master_notification(
  p_target_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'direct_message',
  p_link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para envio administrativo'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_master() THEN
    RAISE EXCEPTION 'Somente o perfil Master pode enviar mensagens administrativas'
      USING ERRCODE = '42501';
  END IF;

  IF p_target_user_id IS NULL
     OR COALESCE(length(btrim(p_title)), 0) = 0
     OR COALESCE(length(btrim(p_message)), 0) = 0 THEN
    RAISE EXCEPTION 'Destinatário, título e mensagem são obrigatórios'
      USING ERRCODE = '22023';
  END IF;

  IF p_type NOT IN ('forum_reply', 'direct_message', 'system', 'award') THEN
    RAISE EXCEPTION 'Tipo de notificação inválido'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    sender_id,
    title,
    message,
    type,
    link
  )
  VALUES (
    p_target_user_id,
    v_caller_id,
    p_title,
    p_message,
    p_type,
    p_link
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_forum_reply(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_forum_reply(uuid)
TO authenticated;

REVOKE ALL ON FUNCTION public.send_instructor_notifications(uuid[], text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_instructor_notifications(uuid[], text, text)
TO authenticated;

REVOKE ALL ON FUNCTION public.send_master_notification(uuid, text, text, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_master_notification(uuid, text, text, text, text)
TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

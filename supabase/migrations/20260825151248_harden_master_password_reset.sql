-- StudySystem — reset administrativo de senha exclusivo para MASTER.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_reset_password(uuid, text);

CREATE FUNCTION public.admin_reset_password(
  target_user_id uuid,
  new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_master() THEN
    RAISE EXCEPTION 'Only MASTER can reset another user password';
  END IF;

  IF target_user_id IS NULL OR new_password IS NULL OR length(new_password) < 8 THEN
    RAISE EXCEPTION 'Invalid password reset request';
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  UPDATE public.profiles
  SET is_temp_password = true
  WHERE id = target_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_reset_password(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

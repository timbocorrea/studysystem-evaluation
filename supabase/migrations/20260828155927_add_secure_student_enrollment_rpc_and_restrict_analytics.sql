-- StudySystem — actor-bound Student enrollment RPC and restricted analytics MV

CREATE OR REPLACE FUNCTION public.self_enroll_course(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  actor_id uuid;
  actor_role text;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.role
    INTO actor_role
    FROM public.profiles AS p
   WHERE p.id = actor_id;

  IF actor_role IS DISTINCT FROM 'STUDENT' THEN
    RAISE EXCEPTION 'Only STUDENT users can self-enroll'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.courses AS c
     WHERE c.id = p_course_id
  ) THEN
    RAISE EXCEPTION 'Course not found'
      USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.course_enrollments AS ce (user_id, course_id, is_active)
  VALUES (actor_id, p_course_id, true)
  ON CONFLICT (user_id, course_id) DO UPDATE
    SET is_active = true,
        enrolled_at = pg_catalog.now()
    WHERE ce.is_active IS DISTINCT FROM true;
END;
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION public.self_enroll_course(uuid) FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.self_enroll_course(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.self_enroll_course(uuid) TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.mv_dashboard_stats FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.mv_dashboard_stats FROM authenticated;

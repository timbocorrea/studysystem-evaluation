-- StudySystem — menor privilégio para RPCs administrativos.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_db_size_bytes()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
  SELECT pg_catalog.pg_database_size(pg_catalog.current_database());
$function$;

REVOKE ALL ON FUNCTION public.get_db_size_bytes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_db_size_bytes() FROM anon;
REVOKE ALL ON FUNCTION public.get_db_size_bytes() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_size_bytes() TO service_role;

CREATE OR REPLACE FUNCTION public.get_db_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  total_size text;
  user_count integer;
  course_count integer;
  lesson_count integer;
  file_count integer;
  file_size bigint;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_instructor() THEN
    RAISE EXCEPTION 'Insufficient privileges'
      USING ERRCODE = '42501';
  END IF;

  SELECT pg_catalog.pg_size_pretty(
    pg_catalog.pg_database_size(pg_catalog.current_database())
  )
  INTO total_size;

  SELECT count(*) INTO user_count FROM auth.users;
  SELECT count(*) INTO course_count FROM public.courses;
  SELECT count(*) INTO lesson_count FROM public.lessons;

  SELECT count(*)
  INTO file_count
  FROM storage.objects
  WHERE owner IS NOT NULL;

  SELECT sum((metadata ->> 'size')::bigint)
  INTO file_size
  FROM storage.objects
  WHERE owner IS NOT NULL;

  RETURN pg_catalog.json_build_object(
    'db_size', total_size,
    'user_count', user_count,
    'course_count', course_count,
    'lesson_count', lesson_count,
    'file_count', COALESCE(file_count, 0),
    'storage_size_bytes', COALESCE(file_size, 0)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_db_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_db_stats() FROM anon;
REVOKE ALL ON FUNCTION public.get_db_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_stats() TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_stats;
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_dashboard_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_dashboard_stats() FROM anon;
REVOKE ALL ON FUNCTION public.refresh_dashboard_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_stats() TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

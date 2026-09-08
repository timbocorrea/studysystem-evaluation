-- Critical security/LGPD remediation for RAG lesson embeddings.
-- This migration prevents global embedding search and requires the caller's
-- authenticated user to have lesson/course access.
--
-- Defensive behavior:
-- Some remote environments may not have the base RAG migration applied yet.
-- In that case this migration must not fail; it emits a NOTICE and exits
-- without touching RLS, policies, or match_lesson_content.

DO $security_lgpd_rag_remediation$
DECLARE
  missing_objects text[];
BEGIN
  missing_objects := array_remove(ARRAY[
    CASE WHEN to_regclass('public.lesson_embeddings') IS NULL THEN 'public.lesson_embeddings' END,
    CASE WHEN to_regclass('public.lessons') IS NULL THEN 'public.lessons' END,
    CASE WHEN to_regclass('public.modules') IS NULL THEN 'public.modules' END,
    CASE WHEN to_regclass('public.courses') IS NULL THEN 'public.courses' END,
    CASE WHEN to_regclass('public.course_enrollments') IS NULL THEN 'public.course_enrollments' END,
    CASE WHEN to_regclass('public.instructor_lesson_assignments') IS NULL THEN 'public.instructor_lesson_assignments' END,
    CASE WHEN to_regprocedure('public.is_master_definer()') IS NULL THEN 'public.is_master_definer()' END,
    CASE WHEN to_regtype('vector') IS NULL THEN 'vector type' END
  ], NULL);

  IF array_length(missing_objects, 1) IS NOT NULL THEN
    RAISE NOTICE
      'RAG security hardening skipped. Missing prerequisite(s): %. RAG is not active in this database until the base RAG migration is applied.',
      array_to_string(missing_objects, ', ');
    RETURN;
  END IF;

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.can_access_lesson_embedding(p_lesson_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      SELECT auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.lessons l
          JOIN public.modules m ON m.id = l.module_id
          JOIN public.courses c ON c.id = m.course_id
          WHERE l.id = p_lesson_id
            AND (
              public.is_master_definer()
              OR c.instructor_id = auth.uid()
              OR EXISTS (
                SELECT 1
                FROM public.instructor_lesson_assignments ila
                WHERE ila.lesson_id = l.id
                  AND ila.user_id = auth.uid()
              )
              OR EXISTS (
                SELECT 1
                FROM public.course_enrollments ce
                WHERE ce.course_id = m.course_id
                  AND ce.user_id = auth.uid()
                  AND ce.is_active = true
              )
            )
        );
    $fn$;
  $sql$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.can_access_lesson_embedding(uuid) FROM PUBLIC, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.can_access_lesson_embedding(uuid) TO authenticated';

  EXECUTE 'ALTER TABLE public.lesson_embeddings ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.lesson_embeddings FORCE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS lesson_embeddings_select_authorized ON public.lesson_embeddings';
  EXECUTE $sql$
    CREATE POLICY lesson_embeddings_select_authorized
      ON public.lesson_embeddings
      FOR SELECT
      TO authenticated
      USING (public.can_access_lesson_embedding(lesson_id));
  $sql$;

  EXECUTE 'DROP FUNCTION IF EXISTS public.match_lesson_content(vector, float, int, uuid)';
  EXECUTE 'DROP FUNCTION IF EXISTS public.match_lesson_content(vector, double precision, integer, uuid)';
  EXECUTE 'DROP FUNCTION IF EXISTS public.match_lesson_content(vector, double precision, integer, uuid, uuid)';

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.match_lesson_content(
      query_embedding vector(768),
      match_threshold double precision,
      match_count integer,
      p_lesson_id uuid DEFAULT NULL,
      p_course_id uuid DEFAULT NULL
    )
    RETURNS TABLE (
      id uuid,
      lesson_id uuid,
      content text,
      similarity double precision,
      metadata jsonb
    )
    LANGUAGE plpgsql
    STABLE
    SECURITY INVOKER
    SET search_path = public
    AS $fn$
    BEGIN
      IF auth.uid() IS NULL THEN
        RETURN;
      END IF;

      RETURN QUERY
      SELECT
        le.id,
        le.lesson_id,
        le.content,
        1 - (le.embedding <=> query_embedding) AS similarity,
        le.metadata
      FROM public.lesson_embeddings le
      JOIN public.lessons l ON l.id = le.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      WHERE (1 - (le.embedding <=> query_embedding) > match_threshold)
        AND (p_lesson_id IS NULL OR le.lesson_id = p_lesson_id)
        AND (p_course_id IS NULL OR m.course_id = p_course_id)
        AND public.can_access_lesson_embedding(le.lesson_id)
      ORDER BY le.embedding <=> query_embedding
      LIMIT LEAST(GREATEST(match_count, 1), 10);
    END;
    $fn$;
  $sql$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.match_lesson_content(vector, double precision, integer, uuid, uuid) FROM PUBLIC, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.match_lesson_content(vector, double precision, integer, uuid, uuid) TO authenticated';

  RAISE NOTICE 'RAG security hardening applied to public.lesson_embeddings and public.match_lesson_content.';
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$security_lgpd_rag_remediation$;

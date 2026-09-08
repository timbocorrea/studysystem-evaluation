-- Safe RAG base activation for StudySystem.
-- This migration must be applied only after review.
-- It creates the base lesson_embeddings table and immediately applies
-- authorization hardening so there is no intended insecure RAG exposure window.
--
-- Defensive behavior:
-- If required academic tables/functions are missing, it emits a NOTICE and exits
-- without creating lesson_embeddings, RLS, policies, or match_lesson_content.

DO $safe_rag_base_activation$
DECLARE
  missing_objects text[];
BEGIN
  missing_objects := array_remove(ARRAY[
    CASE WHEN to_regclass('public.lessons') IS NULL THEN 'public.lessons' END,
    CASE WHEN to_regclass('public.modules') IS NULL THEN 'public.modules' END,
    CASE WHEN to_regclass('public.courses') IS NULL THEN 'public.courses' END,
    CASE WHEN to_regclass('public.course_enrollments') IS NULL THEN 'public.course_enrollments' END,
    CASE WHEN to_regclass('public.instructor_lesson_assignments') IS NULL THEN 'public.instructor_lesson_assignments' END,
    CASE WHEN to_regprocedure('public.is_master_definer()') IS NULL THEN 'public.is_master_definer()' END
  ], NULL);

  IF array_length(missing_objects, 1) IS NOT NULL THEN
    RAISE NOTICE
      'Safe RAG base activation skipped. Missing prerequisite(s): %.',
      array_to_string(missing_objects, ', ');
    RETURN;
  END IF;

  EXECUTE 'CREATE EXTENSION IF NOT EXISTS vector';

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.lesson_embeddings (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
      content text NOT NULL,
      embedding vector(768),
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    )
  $sql$;

  EXECUTE $sql$
    CREATE INDEX IF NOT EXISTS lesson_embeddings_idx
      ON public.lesson_embeddings
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
  $sql$;

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
      USING (public.can_access_lesson_embedding(lesson_id))
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

  RAISE NOTICE 'Safe RAG base activation applied: lesson_embeddings, RLS, policy, and authorized match_lesson_content are ready.';
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$safe_rag_base_activation$;

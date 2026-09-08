-- STUDYSYSTEM-2026
-- FASE 14F — Hardening RLS de public.lesson_progress_requirements
--
-- Escopo:
-- - Ativa RLS em public.lesson_progress_requirements.
-- - Mantém NO FORCE ROW LEVEL SECURITY.
-- - Remove acesso anon.
-- - Remove privilégios perigosos de authenticated.
-- - Cria policies conservadoras staff-only.
-- - Não altera dados.
-- - Não altera Storage.
-- - Não toca PR #13/#23.
--
-- Observação de design:
-- - O helper abaixo é mínimo e específico para esta tabela, evitando dependência
--   de helpers presentes apenas em PRs abertos/draft.
-- - A leitura para aluno poderá ser ampliada futuramente por helper/RPC escopado
--   por aula/curso, após validação funcional específica.

CREATE OR REPLACE FUNCTION public.lesson_progress_requirements_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND upper(coalesce(p.role::text, '')) IN ('MASTER', 'ADMIN', 'INSTRUCTOR')
    );
$$;

REVOKE ALL ON FUNCTION public.lesson_progress_requirements_is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lesson_progress_requirements_is_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.lesson_progress_requirements_is_staff() TO authenticated;

ALTER TABLE public.lesson_progress_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress_requirements NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lesson_progress_requirements_select_staff ON public.lesson_progress_requirements;
DROP POLICY IF EXISTS lesson_progress_requirements_insert_staff ON public.lesson_progress_requirements;
DROP POLICY IF EXISTS lesson_progress_requirements_update_staff ON public.lesson_progress_requirements;
DROP POLICY IF EXISTS lesson_progress_requirements_delete_staff ON public.lesson_progress_requirements;

REVOKE ALL ON TABLE public.lesson_progress_requirements FROM anon;
REVOKE ALL ON TABLE public.lesson_progress_requirements FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.lesson_progress_requirements
TO authenticated;

CREATE POLICY lesson_progress_requirements_select_staff
ON public.lesson_progress_requirements
FOR SELECT
TO authenticated
USING (
  public.lesson_progress_requirements_is_staff()
);

CREATE POLICY lesson_progress_requirements_insert_staff
ON public.lesson_progress_requirements
FOR INSERT
TO authenticated
WITH CHECK (
  public.lesson_progress_requirements_is_staff()
);

CREATE POLICY lesson_progress_requirements_update_staff
ON public.lesson_progress_requirements
FOR UPDATE
TO authenticated
USING (
  public.lesson_progress_requirements_is_staff()
)
WITH CHECK (
  public.lesson_progress_requirements_is_staff()
);

CREATE POLICY lesson_progress_requirements_delete_staff
ON public.lesson_progress_requirements
FOR DELETE
TO authenticated
USING (
  public.lesson_progress_requirements_is_staff()
);

NOTIFY pgrst, 'reload schema';

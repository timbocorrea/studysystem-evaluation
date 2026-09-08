-- STUDYSYSTEM-2026
-- FASE 14B — Hardening RLS de public.quiz_bank_questions
--
-- Contexto:
-- - Diagnostico read-only confirmou public.quiz_bank_questions sem RLS, sem policies
--   e com grants amplos para anon/authenticated.
-- - A tabela possui vinculos validos com public.quizzes e public.question_bank,
--   sem orfaos e sem duplicidades no momento do diagnostico.
--
-- Escopo desta migration:
-- - Ativa RLS em public.quiz_bank_questions.
-- - Nao ativa FORCE RLS inicialmente.
-- - Remove acesso anon.
-- - Mantem acesso authenticated somente via policies staff-only.
-- - Nao altera dados.
-- - Nao altera question_bank nem question_bank_options.
-- - Nao torna nenhuma tabela/bucket privado.

-- Helper staff-only baseado em public.profiles.role.
CREATE OR REPLACE FUNCTION public.is_current_user_instructor_or_master()
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

REVOKE ALL ON FUNCTION public.is_current_user_instructor_or_master() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_user_instructor_or_master() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_instructor_or_master() TO authenticated;

-- Ativar RLS sem FORCE RLS.
ALTER TABLE public.quiz_bank_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_questions NO FORCE ROW LEVEL SECURITY;

-- Remover policies esperadas, se ja existirem.
DROP POLICY IF EXISTS quiz_bank_questions_select_staff ON public.quiz_bank_questions;
DROP POLICY IF EXISTS quiz_bank_questions_insert_staff ON public.quiz_bank_questions;
DROP POLICY IF EXISTS quiz_bank_questions_update_staff ON public.quiz_bank_questions;
DROP POLICY IF EXISTS quiz_bank_questions_delete_staff ON public.quiz_bank_questions;

DROP POLICY IF EXISTS quiz_bank_questions_instructor_master_read ON public.quiz_bank_questions;
DROP POLICY IF EXISTS quiz_bank_questions_instructor_master_write ON public.quiz_bank_questions;

-- Policies conservadoras: somente staff autenticado.
CREATE POLICY quiz_bank_questions_select_staff
ON public.quiz_bank_questions
FOR SELECT
TO authenticated
USING (
  public.is_current_user_instructor_or_master()
);

CREATE POLICY quiz_bank_questions_insert_staff
ON public.quiz_bank_questions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_instructor_or_master()
);

CREATE POLICY quiz_bank_questions_update_staff
ON public.quiz_bank_questions
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_instructor_or_master()
)
WITH CHECK (
  public.is_current_user_instructor_or_master()
);

CREATE POLICY quiz_bank_questions_delete_staff
ON public.quiz_bank_questions
FOR DELETE
TO authenticated
USING (
  public.is_current_user_instructor_or_master()
);

-- Grants: remover exposicao anon e reduzir authenticated ao minimo funcional.
REVOKE ALL ON TABLE public.quiz_bank_questions FROM anon;
REVOKE ALL ON TABLE public.quiz_bank_questions FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.quiz_bank_questions
TO authenticated;
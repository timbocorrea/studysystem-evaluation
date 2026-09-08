-- StudySystem - torna is_master_definer() estritamente booleana.
-- Corrige propagacao de NULL quando a claim JWT role nao existe.
-- Nao altera dados, tabelas, policies ou ACLs.

CREATE OR REPLACE FUNCTION public.is_master_definer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND (
      COALESCE(
        (auth.jwt() ->> 'role') = 'MASTER',
        false
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'MASTER'
      )
    );
$function$;
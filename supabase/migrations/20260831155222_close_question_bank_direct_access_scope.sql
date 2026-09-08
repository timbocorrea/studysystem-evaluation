BEGIN;

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/Instructors can do everything on question_bank" ON public.question_bank;
DROP POLICY IF EXISTS "Allow admin all on question_bank" ON public.question_bank;
DROP POLICY IF EXISTS "Allow public select on question_bank" ON public.question_bank;
DROP POLICY IF EXISTS "Authenticated users can select from question_bank" ON public.question_bank;
DROP POLICY IF EXISTS question_bank_staff_select ON public.question_bank;
DROP POLICY IF EXISTS question_bank_staff_insert ON public.question_bank;
DROP POLICY IF EXISTS question_bank_staff_update ON public.question_bank;
DROP POLICY IF EXISTS question_bank_staff_delete ON public.question_bank;

DROP POLICY IF EXISTS "Admins/Instructors can do everything on question_bank_options" ON public.question_bank_options;
DROP POLICY IF EXISTS "Allow admin all on question_bank_options" ON public.question_bank_options;
DROP POLICY IF EXISTS "Allow public select on question_bank_options" ON public.question_bank_options;
DROP POLICY IF EXISTS "Authenticated users can select from question_bank_options" ON public.question_bank_options;
DROP POLICY IF EXISTS question_bank_options_staff_select ON public.question_bank_options;
DROP POLICY IF EXISTS question_bank_options_staff_insert ON public.question_bank_options;
DROP POLICY IF EXISTS question_bank_options_staff_update ON public.question_bank_options;
DROP POLICY IF EXISTS question_bank_options_staff_delete ON public.question_bank_options;

REVOKE ALL PRIVILEGES ON TABLE public.question_bank FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.question_bank_options FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.question_bank TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.question_bank_options TO authenticated;

CREATE POLICY question_bank_staff_select
ON public.question_bank
FOR SELECT
TO authenticated
USING (public.is_instructor());

CREATE POLICY question_bank_staff_insert
ON public.question_bank
FOR INSERT
TO authenticated
WITH CHECK (public.is_instructor());

CREATE POLICY question_bank_staff_update
ON public.question_bank
FOR UPDATE
TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

CREATE POLICY question_bank_staff_delete
ON public.question_bank
FOR DELETE
TO authenticated
USING (public.is_instructor());

CREATE POLICY question_bank_options_staff_select
ON public.question_bank_options
FOR SELECT
TO authenticated
USING (public.is_instructor());

CREATE POLICY question_bank_options_staff_insert
ON public.question_bank_options
FOR INSERT
TO authenticated
WITH CHECK (public.is_instructor());

CREATE POLICY question_bank_options_staff_update
ON public.question_bank_options
FOR UPDATE
TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

CREATE POLICY question_bank_options_staff_delete
ON public.question_bank_options
FOR DELETE
TO authenticated
USING (public.is_instructor());

NOTIFY pgrst, 'reload schema';

COMMIT;

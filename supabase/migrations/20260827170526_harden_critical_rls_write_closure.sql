BEGIN;

DROP POLICY IF EXISTS "courses_write_auth"
ON public.courses;

DROP POLICY IF EXISTS "courses_update_auth"
ON public.courses;

DROP POLICY IF EXISTS "courses_delete_auth"
ON public.courses;

DROP POLICY IF EXISTS "modules_write_auth"
ON public.modules;

DROP POLICY IF EXISTS "modules_update_auth"
ON public.modules;

DROP POLICY IF EXISTS "modules_delete_auth"
ON public.modules;

DROP POLICY IF EXISTS "lessons_write_auth"
ON public.lessons;

DROP POLICY IF EXISTS "lessons_delete_auth"
ON public.lessons;

DROP POLICY IF EXISTS "Allow write access to authenticated users"
ON public.system_settings;

CREATE POLICY "Allow write access to authenticated users"
ON public.system_settings
FOR ALL
TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

COMMIT;

NOTIFY pgrst, 'reload schema';

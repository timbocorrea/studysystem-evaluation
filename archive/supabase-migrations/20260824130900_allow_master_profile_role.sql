-- StudySystem - versiona MASTER como role persistida valida.
-- Esta migration altera somente o CHECK de public.profiles.role.
-- Nao promove usuarios e nao altera dados existentes.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (
    role = ANY (
      ARRAY[
        'STUDENT'::text,
        'INSTRUCTOR'::text,
        'MASTER'::text
      ]
    )
  );
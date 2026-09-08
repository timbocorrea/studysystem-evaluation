-- StudySystem — remove credencial persistida de IA dos perfis.

BEGIN;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS gemini_api_key;

COMMIT;

NOTIFY pgrst, 'reload schema';

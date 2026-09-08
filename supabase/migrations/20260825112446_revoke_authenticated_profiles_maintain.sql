-- StudySystem — remove unintended MAINTAIN privilege from authenticated profiles access.

BEGIN;

REVOKE MAINTAIN ON TABLE public.profiles FROM authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

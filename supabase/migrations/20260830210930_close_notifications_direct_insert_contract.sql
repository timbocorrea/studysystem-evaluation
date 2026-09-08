BEGIN;

REVOKE INSERT ON TABLE public.notifications
FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS notifications_insert_system
ON public.notifications;

NOTIFY pgrst, 'reload schema';

COMMIT;

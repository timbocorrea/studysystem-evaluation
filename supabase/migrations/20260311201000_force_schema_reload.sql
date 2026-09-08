-- Force schema reload for PostgREST
-- This is necessary after migrations change indices or functions that PostgREST caches.

NOTIFY pgrst, 'reload schema';

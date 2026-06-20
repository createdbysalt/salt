-- Force PostgREST to reload its schema cache
-- This is needed after adding new tables

NOTIFY pgrst, 'reload schema';

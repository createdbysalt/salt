-- Fix: salt_learnings table missing grants for authenticated role
-- The table has RLS policies for SELECT/UPDATE but no base GRANT,
-- causing 42501 errors on the Me page

GRANT SELECT, UPDATE ON public.salt_learnings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salt_learnings TO service_role;

-- Fix: player_context table missing grants for authenticated role
-- The 20260707230000 migration enabled RLS + policies but missed GRANT statements

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_context TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_context TO service_role;

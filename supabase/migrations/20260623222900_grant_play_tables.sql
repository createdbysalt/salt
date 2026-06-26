-- ============================================================================
-- Plays: table grants for authenticated and service-role access
-- ============================================================================
-- The original Plays migration created RLS policies but did not grant table
-- privileges, so PostgREST rejected reads before policy evaluation.
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.play_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.play_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_gaps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.play_run_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_entries TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.play_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.play_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_gaps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.play_run_sources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_entries TO service_role;

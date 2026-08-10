-- Repair: grant privileges on capture_training_feedback + capture_triage_actions
-- Same latent 42501 as capture_blocklist (fixed 20260806220000): the creating
-- migration (20260713260000) enabled RLS and defined workspace-scoped policies
-- but never granted table privileges. Writes currently succeed only because
-- application code uses the service-role admin client on environments with
-- default-privilege coverage; any authenticated-client access fails with
-- "permission denied for table" (42501).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_training_feedback TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_training_feedback TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_triage_actions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_triage_actions TO authenticated;

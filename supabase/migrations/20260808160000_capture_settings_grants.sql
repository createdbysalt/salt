-- Sources plan 4.4 follow-up: workspace_capture_settings has no GRANTs.
--
-- Same latent-42501 class as capture_blocklist (0.4) and the billing ledger
-- (20260806130000): the table shipped with RLS policies but no grants, so
-- EVERY role — including service_role — gets "permission denied for table
-- workspace_capture_settings". Live casualties since 2026-07-13:
-- getAutoApplySettings (silent default fallback — auto-apply could never be
-- earned) and updateCalibrationSnapshot (upsert always errored).
--
-- Grants match the table's documented policy design: members read, admins
-- manage (RLS gates rows), service_role writes the calibration snapshot and
-- the 4.4 discovery stamp. DELETE stays withheld — the row is 1:1 with the
-- workspace and dies with it via ON DELETE CASCADE.

GRANT SELECT ON public.workspace_capture_settings TO authenticated;
GRANT INSERT, UPDATE ON public.workspace_capture_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.workspace_capture_settings TO service_role;
REVOKE ALL ON public.workspace_capture_settings FROM anon;

-- Repair: grant privileges on capture_blocklist
-- The original migration (20260712140000) created the table + RLS policies but
-- never granted table privileges, so service_role queries fail with 42501
-- "permission denied for table capture_blocklist" on environments without
-- default-privilege coverage (observed on salt-staging 2026-08-06).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_blocklist TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_blocklist TO authenticated;

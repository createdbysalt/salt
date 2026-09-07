-- ============================================================================
-- Grants repair: platform_health_checks service-role access
-- ============================================================================
--
-- 20260830030000_platform_health_checks.sql created the table with RLS and
-- no policies (service-role only by design) but forgot the table GRANT, so
-- the canary cron got "permission denied for table platform_health_checks".
-- Same repair pattern as 20260829210000_correction_events_grants_repair.sql.
--
-- SELECT + INSERT only: the table is append-only ops telemetry. No grant to
-- authenticated/anon — ops data never reaches PostgREST clients.
--
-- Rollback:
--   REVOKE SELECT, INSERT ON public.platform_health_checks FROM service_role;
-- ============================================================================

GRANT SELECT, INSERT ON public.platform_health_checks TO service_role;

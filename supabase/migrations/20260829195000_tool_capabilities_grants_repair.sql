-- ============================================================================
-- REPAIR: tool_capabilities missing table-level GRANTs
-- ============================================================================
--
-- Staging (nbapomfgcsrsqdvenqmf) on 2026-08-29: every read of
-- public.tool_capabilities through PostgREST fails with
-- 42501 "permission denied for table tool_capabilities" — for service_role
-- included. The table's RLS policy exists but GRANTs never landed (default
-- privileges did not cover this table), so the capability resolver fails
-- closed and every connector-category playbook fetch step dies with
-- "No provider available for <capability>".
--
-- The table is platform-global reference data (see
-- 20260707150000_tool_capabilities.sql): authenticated read, service-role
-- write — same posture as connector_catalog / tool_classifications.
--
-- Rollback:
--   REVOKE SELECT ON public.tool_capabilities FROM authenticated;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public.tool_capabilities FROM service_role;
-- ============================================================================

GRANT SELECT ON public.tool_capabilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_capabilities TO service_role;

-- Post-push assertion (the ledger has lied before).
DO $$
BEGIN
  IF NOT has_table_privilege('service_role', 'public.tool_capabilities', 'SELECT') THEN
    RAISE EXCEPTION 'service_role still lacks SELECT on tool_capabilities';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.tool_capabilities', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated still lacks SELECT on tool_capabilities';
  END IF;
END $$;

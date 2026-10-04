-- ============================================================================
-- REPAIR: playbook_definitions missing table-level GRANTs
-- ============================================================================
--
-- Staging (nbapomfgcsrsqdvenqmf) on 2026-08-29: reads of
-- public.playbook_definitions through PostgREST fail with
-- 42501 "permission denied for table playbook_definitions" — service_role
-- included. The table + RLS policies exist (20260830000000) but GRANTs never
-- landed (default privileges did not cover this table — same failure mode
-- as tool_capabilities / correction_events earlier today), so the
-- user-authored playbook merge in getPlaybooksV2ForWorkspace errors and the
-- Playbooks tab shows the discovery-issues banner.
--
-- Posture: workspace-owned user data — members read/write their own rows
-- through RLS (authenticated), service_role full access for the admin-client
-- write/read paths in db-definitions.ts.
--
-- Rollback:
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public.playbook_definitions FROM authenticated;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public.playbook_definitions FROM service_role;
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbook_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbook_definitions TO service_role;

-- Post-push assertion (the ledger has lied before).
DO $$
BEGIN
  IF NOT has_table_privilege('service_role', 'public.playbook_definitions', 'SELECT') THEN
    RAISE EXCEPTION 'service_role still lacks SELECT on playbook_definitions';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.playbook_definitions', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated still lacks SELECT on playbook_definitions';
  END IF;
END $$;

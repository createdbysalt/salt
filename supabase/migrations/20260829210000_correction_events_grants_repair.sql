-- ============================================================================
-- REPAIR: correction_events missing table-level GRANTs
-- ============================================================================
--
-- Staging (<project-ref>) on 2026-08-29: reads of
-- public.correction_events through PostgREST fail with
-- 42501 "permission denied for table correction_events" — service_role
-- included. The table's RLS policies exist (20260710130000) but GRANTs never
-- landed, so the correction blocklist (app/_lib/learning/correction-
-- blocklist.ts) fails open on every care-pipeline write and "Not this"
-- dismissals never actually block re-proposals.
--
-- Posture matches the RLS policies: workspace members read and record their
-- own corrections; service_role does everything (background pipelines).
--
-- Rollback:
--   REVOKE SELECT, INSERT ON public.correction_events FROM authenticated;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public.correction_events FROM service_role;
-- ============================================================================

GRANT SELECT, INSERT ON public.correction_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.correction_events TO service_role;

-- Post-push assertion (the ledger has lied before).
DO $$
BEGIN
  IF NOT has_table_privilege('service_role', 'public.correction_events', 'SELECT') THEN
    RAISE EXCEPTION 'service_role still lacks SELECT on correction_events';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.correction_events', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated still lacks SELECT on correction_events';
  END IF;
END $$;

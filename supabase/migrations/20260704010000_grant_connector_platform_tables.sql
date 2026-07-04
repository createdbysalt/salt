-- ============================================================================
-- GRANT PRIVILEGES ON CONNECTOR PLATFORM TABLES
-- ============================================================================
--
-- Root cause of the staging Customize page outage (2026-07-03): the
-- connector-platform core migration (20260703210000) created tables + RLS
-- but no GRANTs, and this database does not carry default privileges for
-- anon/authenticated/service_role (same failure mode as
-- 20260614000300_grant_entity_tables_to_authenticated). PostgREST returned
-- 42501 for service_role on connector_catalog, the DB registry threw, and
-- getConnectorsPageData crashed the page. Superuser audits (psql as
-- postgres) bypassed grants, which is why row counts looked healthy.
--
-- Access model:
--   service_role  — ALL on all six tables (registry reads, sync job writes,
--                   review-queue actions, ingress drift log)
--   authenticated — SELECT only, matching the RLS read policies
--                   (connector_sync_events is operator-facing: no grant)
-- ============================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'connector_catalog',
    'connector_overrides',
    'connector_tools',
    'connector_trigger_types',
    'tool_classifications',
    'connector_sync_events'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', t
      );
    END IF;
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'connector_catalog',
    'connector_overrides',
    'connector_tools',
    'connector_trigger_types',
    'tool_classifications'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

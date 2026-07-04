-- ============================================================================
-- DROP NATIVE GMAIL + CALENDAR CONNECTION TABLES (connector-platform Phase 1.6)
-- ============================================================================
--
-- The native Gmail Pub/Sub pipeline and native Google Calendar OAuth were
-- retired 2026-07-03 (Composio-only rule; Composio is the sole token
-- custodian). Every table below has ZERO app-code references after the
-- Phase 1.1–1.5 retirements (import + PostgREST embedded-join sweeps).
--
-- Staging-first policy (schema-mod Pre-0.2): lands on the CLI-linked project.
-- Before executing: export rows to .backups/pre-drop-* per drop protocol.
--
-- NOT dropped here:
--   - client_emails / email_file_attachments  (frozen; Conversations still
--     reads them — retired with the conversations rebuild, plan Phase 6.2)
--   - workspace_calendar_connections           (live Composio-era table)
--
-- Guard: the drop_bridge_tables incident (2026-07-03) left an orphaned
-- trigger on auth.users referencing a dropped table and broke all logins.
-- Scan trigger-function bodies for references to the tables being dropped
-- and abort if any live outside the tables themselves.
-- ============================================================================

DO $$
DECLARE
  offender RECORD;
BEGIN
  FOR offender IN
    SELECT DISTINCT
      trg.tgname,
      cls.relname AS table_name,
      pro.proname AS function_name
    FROM pg_trigger trg
    JOIN pg_class cls ON cls.oid = trg.tgrelid
    JOIN pg_proc pro ON pro.oid = trg.tgfoid
    WHERE NOT trg.tgisinternal
      AND cls.relname NOT IN (
        'gmail_connections', 'gmail_watches', 'gmail_sync_logs',
        'calendar_connections'
      )
      AND (
        pro.prosrc ILIKE '%gmail_connections%'
        OR pro.prosrc ILIKE '%gmail_watches%'
        OR pro.prosrc ILIKE '%gmail_sync_logs%'
        OR pro.prosrc ILIKE '%calendar_connections%'
      )
      -- workspace_calendar_connections is live and matches the
      -- calendar_connections substring; ignore functions that only
      -- reference the workspace-scoped table.
      AND NOT (
        pro.prosrc ILIKE '%workspace_calendar_connections%'
        AND pro.prosrc NOT ILIKE '% calendar_connections%'
        AND pro.prosrc NOT ILIKE '%public.calendar_connections%'
      )
  LOOP
    RAISE EXCEPTION
      'Trigger % on table % (function %) references a table this migration drops — review before dropping',
      offender.tgname, offender.table_name, offender.function_name;
  END LOOP;
END $$;

-- Native Gmail Pub/Sub pipeline (retired Phase 1.4)
DROP TABLE IF EXISTS public.gmail_sync_logs CASCADE;
DROP TABLE IF EXISTS public.gmail_watches CASCADE;
DROP TABLE IF EXISTS public.gmail_connections CASCADE;

-- Native Google Calendar OAuth (dead since the Composio migration;
-- zero code references — schema-mod B0.2 gated drop list)
DROP TABLE IF EXISTS public.calendar_connections CASCADE;

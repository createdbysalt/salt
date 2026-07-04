-- ============================================================================
-- DROP meeting_types (connector-platform Phase 4.3)
-- ============================================================================
--
-- Native Cal.com retired 2026-07-04: bookings now arrive via the Composio
-- `cal` toolkit (CAL_LIST_BOOKINGS polling — the toolkit exposes zero
-- trigger types) through the capture adapter + cal-booking-processor.
-- meeting_types existed to sync Salt-defined event types TO Cal.com
-- (outbound event-type sync, calcom-sync.ts) — that direction is retired;
-- users manage event types in Cal.com itself. The meetings registry
-- vocabulary already replaced this table's UI role.
--
-- Zero app-code references after the Phase 4.3 sweep (import + PostgREST
-- embedded-join rg sweeps: `meeting_types` matches only generated types).
-- No inbound FKs (pg_constraint confrelid scan on both projects, 2026-07-04).
--
-- Row exports (drop protocol): .backups/pre-drop-meeting_types-<ref>-20260704.json
-- taken from BOTH projects before push (prod had 12 rows, staging 0).
--
-- Guard: the drop_bridge_tables incident (2026-07-03) left an orphaned
-- trigger on auth.users referencing a dropped table and broke all logins.
-- Scan trigger-function bodies for references to the table being dropped
-- and abort if any live outside the table itself.
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
      AND cls.relname <> 'meeting_types'
      AND pro.prosrc ILIKE '%meeting_types%'
  LOOP
    RAISE EXCEPTION
      'Trigger % on table % (function %) references meeting_types — review before dropping',
      offender.tgname, offender.table_name, offender.function_name;
  END LOOP;
END $$;

-- Outbound Cal.com event-type sync store (retired Phase 4.3)
DROP TABLE IF EXISTS public.meeting_types CASCADE;

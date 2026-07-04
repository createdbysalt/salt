-- ============================================================================
-- RENAME client_meetings -> meetings (connector-platform Phase 6.3)
-- ============================================================================
--
-- Naming canon: memory record tables are the sidebar product nouns, plural.
-- Meetings is a memory record surface; the client_ era prefix is banned.
--
-- Rename mechanics (the `studios` precedent, iron rule 2):
--   * table renames; constraints + indexes carrying the old name rename too
--     (dynamically — the ledger has lied before, so we rename whatever
--     actually exists rather than a hardcoded list)
--   * RLS policies and inbound FKs (meeting_transcripts/summaries/etc.) are
--     OID-based and survive the rename untouched
--   * the bespoke update_client_meetings_updated_at trigger/function is
--     replaced by the shared public.set_updated_at()
--   * a compatibility VIEW `client_meetings` bridges the deploy window
--     (single-table view: auto-updatable, so old code's writes still land);
--     dropped one release later (Phase 6.6 endgame)
--   * inbox_read_states.source_table data values migrate so read/archive
--     state survives the rename
--
-- Guard: abort if any function OUTSIDE the table's own machinery still
-- references client_meetings by name (function bodies are text and would
-- break silently after rename).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Guard: no stray function bodies reference the old name
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  offender RECORD;
BEGIN
  FOR offender IN
    SELECT pro.proname
    FROM pg_proc pro
    JOIN pg_namespace nsp ON nsp.oid = pro.pronamespace
    WHERE nsp.nspname = 'public'
      AND pro.proname <> 'update_client_meetings_updated_at'
      AND pro.prosrc ILIKE '%client_meetings%'
  LOOP
    RAISE EXCEPTION
      'Function public.%() references client_meetings — recreate it against meetings in this migration before renaming',
      offender.proname;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Belt-and-braces: Bridge-era policy (client_id/client_users CASCADE
--    should have removed it already; the ledger has lied before)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Client users can view their shared meetings" ON public.client_meetings;

-- ---------------------------------------------------------------------------
-- 2. Rename the table
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_meetings RENAME TO meetings;

-- ---------------------------------------------------------------------------
-- 3. Rename constraints + indexes that carry the old name
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Constraints on the renamed table (pkey, fkeys; CHECKs are valid_* and
  -- carry no table prefix)
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.meetings'::regclass
      AND conname LIKE '%client_meetings%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.meetings RENAME CONSTRAINT %I TO %I',
      r.conname, replace(r.conname, 'client_meetings', 'meetings')
    );
  END LOOP;

  -- Indexes on the renamed table
  FOR r IN
    SELECT cls.relname
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.meetings'::regclass
      AND cls.relname LIKE '%client_meetings%'
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.relname, replace(r.relname, 'client_meetings', 'meetings')
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Replace the bespoke updated_at trigger with the shared function
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS client_meetings_updated_at ON public.meetings;
DROP FUNCTION IF EXISTS public.update_client_meetings_updated_at();

CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Compatibility view under the old name (bridges the deploy window;
--    dropped in Phase 6.6 once nothing references it)
-- ---------------------------------------------------------------------------
CREATE VIEW public.client_meetings
WITH (security_invoker = true)
AS SELECT * FROM public.meetings;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_meetings TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Data migration: inbox read/archive state keyed by source_table
-- ---------------------------------------------------------------------------
UPDATE public.inbox_read_states
SET source_table = 'meetings'
WHERE source_table = 'client_meetings';

-- ---------------------------------------------------------------------------
-- 7. Post-rename assertions (the ledger has lied before)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.meetings') IS NULL THEN
    RAISE EXCEPTION 'meetings table missing after rename';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'client_meetings'
  ) THEN
    RAISE EXCEPTION 'client_meetings compatibility view missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.meetings'::regclass
      AND conname LIKE '%client_meetings%'
  ) OR EXISTS (
    SELECT 1 FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.meetings'::regclass
      AND cls.relname LIKE '%client_meetings%'
  ) THEN
    RAISE EXCEPTION 'stale client_meetings-named constraint/index survived the rename';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.meetings'::regclass
      AND tgname = 'meetings_updated_at'
  ) THEN
    RAISE EXCEPTION 'meetings_updated_at trigger missing';
  END IF;
END $$;

-- ============================================================================
-- RENAME project_files -> files + retire project_id column
-- (connector-platform Phase 6.4)
-- ============================================================================
--
-- Naming canon: memory record tables are the sidebar product nouns, plural.
-- Work linkage moves to the unified edge store: entity_links rows
-- (source_type='file', target_type='work') — the keeper Phase 4 store is
-- live and files already read it for linked entities. person_id /
-- organization_id remain as counterparty columns (same shape as meetings
-- and projects).
--
-- Order matters: backfill edges from project_id BEFORE dropping the column.
--
-- Rename mechanics (iron rule 2): constraints + indexes carrying the old
-- name rename dynamically; RLS policies and inbound FKs
-- (file_tag_assignments, file_activities, email attachments already gone)
-- are OID-based and survive. No bespoke trigger exists on this table.
--
-- Compatibility view `project_files` bridges the deploy window. It exposes
-- project_id computed from entity_links so old readers stay correct; writes
-- that include project_id fail loudly during the (minutes-long) window —
-- acceptable, both DBs hold test data. View drops in the Phase 6.6 endgame.
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
      AND pro.prosrc ILIKE '%project_files%'
  LOOP
    RAISE EXCEPTION
      'Function public.%() references project_files — recreate it against files in this migration before renaming',
      offender.proname;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Backfill entity_links from the legacy project_id column
-- ---------------------------------------------------------------------------
INSERT INTO public.entity_links
  (workspace_id, source_type, source_id, target_type, target_id,
   relation_type, source, created_at)
SELECT
  pf.workspace_id, 'file', pf.id, 'work', pf.project_id,
  'related', 'system', COALESCE(pf.updated_at, pf.created_at, now())
FROM public.project_files pf
WHERE pf.project_id IS NOT NULL
  -- only to work rows that still exist (dangling FKs never existed: FK enforced)
ON CONFLICT (workspace_id, source_type, source_id, target_type, target_id, relation_type)
DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Drop the legacy column (its FK + partial index ride along)
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_files DROP COLUMN IF EXISTS project_id CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Rename the table
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_files RENAME TO files;

-- ---------------------------------------------------------------------------
-- 4. Rename constraints + indexes that carry the old name
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.files'::regclass
      AND conname LIKE '%project_files%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.files RENAME CONSTRAINT %I TO %I',
      r.conname, replace(r.conname, 'project_files', 'files')
    );
  END LOOP;

  FOR r IN
    SELECT cls.relname
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.files'::regclass
      AND cls.relname LIKE '%project_files%'
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.relname, replace(r.relname, 'project_files', 'files')
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Compatibility view under the old name (project_id computed from edges
--    for read-correctness; drops in Phase 6.6)
-- ---------------------------------------------------------------------------
CREATE VIEW public.project_files
WITH (security_invoker = true)
AS SELECT
  f.*,
  (
    SELECT el.target_id
    FROM public.entity_links el
    WHERE el.workspace_id = f.workspace_id
      AND el.source_type = 'file'
      AND el.source_id = f.id
      AND el.target_type = 'work'
    ORDER BY el.created_at ASC
    LIMIT 1
  ) AS project_id
FROM public.files f;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Post-rename assertions (the ledger has lied before)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.files') IS NULL THEN
    RAISE EXCEPTION 'files table missing after rename';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'project_files'
  ) THEN
    RAISE EXCEPTION 'project_files compatibility view missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'project_id'
  ) THEN
    RAISE EXCEPTION 'files.project_id survived the drop';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.files'::regclass
      AND conname LIKE '%project_files%'
  ) OR EXISTS (
    SELECT 1 FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.files'::regclass
      AND cls.relname LIKE '%project_files%'
  ) THEN
    RAISE EXCEPTION 'stale project_files-named constraint/index survived the rename';
  END IF;
END $$;

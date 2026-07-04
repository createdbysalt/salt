-- ============================================================================
-- meetings.project_id -> work_id (connector-platform Phase 6.5 column wave)
-- ============================================================================
--
-- Canon rule 8: when a table renames, FK columns elsewhere rename in the
-- same wave, one owning table per PR. This is the meetings PR.
--
-- The FK constraint survives by OID; constraint/index NAMES carrying
-- project_id rename dynamically. The client_meetings compat view keeps its
-- frozen output column name `project_id` (view columns are fixed at creation;
-- the internal reference follows the rename by OID) — so pre-rename readers
-- stay correct through the deploy window. The view drops at 6.6.
-- ============================================================================

ALTER TABLE public.meetings RENAME COLUMN project_id TO work_id;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.meetings'::regclass
      AND conname LIKE '%project_id%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.meetings RENAME CONSTRAINT %I TO %I',
      r.conname, replace(r.conname, 'project_id', 'work_id')
    );
  END LOOP;

  FOR r IN
    SELECT cls.relname
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.meetings'::regclass
      AND cls.relname LIKE '%project%'
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.relname, replace(replace(r.relname, 'project_id', 'work_id'), 'project', 'work')
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meetings' AND column_name = 'work_id'
  ) THEN
    RAISE EXCEPTION 'meetings.work_id missing after rename';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meetings' AND column_name = 'project_id'
  ) THEN
    RAISE EXCEPTION 'meetings.project_id survived the rename';
  END IF;
END $$;

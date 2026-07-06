-- ============================================================================
-- billing_records.project_id -> work_id (connector-platform Phase 6.5 column wave)
-- ============================================================================
-- Canon rule 8: FK columns rename in the same wave as their target table,
-- one owning table per PR/commit. This is the billing_records step.
-- ============================================================================

ALTER TABLE public.billing_records RENAME COLUMN project_id TO work_id;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.billing_records'::regclass
      AND conname LIKE '%project_id%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.billing_records RENAME CONSTRAINT %I TO %I',
      r.conname, replace(r.conname, 'project_id', 'work_id')
    );
  END LOOP;

  FOR r IN
    SELECT cls.relname
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.billing_records'::regclass
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
    WHERE table_schema = 'public' AND table_name = 'billing_records' AND column_name = 'work_id'
  ) THEN
    RAISE EXCEPTION 'billing_records.work_id missing after rename';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_records' AND column_name = 'project_id'
  ) THEN
    RAISE EXCEPTION 'billing_records.project_id survived the rename';
  END IF;
END $$;

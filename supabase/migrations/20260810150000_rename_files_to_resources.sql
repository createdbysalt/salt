-- ============================================================================
-- RENAME the Files Memory record table to resources (product noun Resources).
--
-- App code already speaks `resource`; this migration retires the `files` /
-- `file` storage spelling so SQL, generated types, and agents match product
-- language. See .cursor/plans/2026-08-10-files-to-resources-alignment.md and
-- docs/plans/2026-08-10-resources-table-rename.md.
--
-- Authored against staging (project <project-ref>) — test data only,
-- no customers. Safe to run once; guards raise if referenced shapes differ.
--
-- What changes:
--   - Table:          public.files            -> public.resources
--   - Satellites:     file_activities          -> resource_activities (+ file_id -> resource_id)
--                     file_tags                -> resource_tags
--                     file_tag_assignments     -> resource_tag_assignments (+ file_id -> resource_id)
--   - Entity spell:   short-dialect / learning CHECKs 'file' -> 'resource'
--   - Views:          drop compat view project_files (schema-modernization 6.6)
--   - RLS:            policy names updated; RLS is OID-based and survives
--   - Storage:        bucket `bridge-files` NOT renamed (bytes artifact)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Guards: no function bodies reference the old table name
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
      'Function public.%() still references project_files — recreate it before renaming',
      offender.proname;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Drop the compatibility view (no code reads it anymore)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.project_files CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Rename the core table
-- ---------------------------------------------------------------------------
ALTER TABLE public.files RENAME TO resources;

-- Rename constraints + indexes that still carry the old name
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.resources'::regclass
      AND (conname LIKE '%project_files%' OR conname LIKE 'files%')
  LOOP
    EXECUTE format(
      'ALTER TABLE public.resources RENAME CONSTRAINT %I TO %I',
      r.conname,
      replace(replace(r.conname, 'project_files', 'resources'), 'files', 'resources')
    );
  END LOOP;

  FOR r IN
    SELECT cls.relname
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.resources'::regclass
      AND (cls.relname LIKE '%project_files%' OR cls.relname LIKE '%files%')
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.relname,
      replace(replace(r.relname, 'project_files', 'resources'), 'files', 'resources')
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Satellite tables (file_* -> resource_*)
-- ---------------------------------------------------------------------------
ALTER TABLE public.file_activities RENAME TO resource_activities;
ALTER TABLE public.resource_activities RENAME COLUMN file_id TO resource_id;

ALTER TABLE public.file_tags RENAME TO resource_tags;
ALTER TABLE public.file_tag_assignments RENAME TO resource_tag_assignments;
ALTER TABLE public.resource_tag_assignments RENAME COLUMN file_id TO resource_id;

-- ---------------------------------------------------------------------------
-- 4. Entity-type spelling: 'file' -> 'resource' (short + learning dialects)
-- ---------------------------------------------------------------------------

-- helper: recreate a column CHECK replacing 'file' with 'resource'.
-- Drop first, backfill, then re-add (CHECKs are validated during UPDATE).
CREATE OR REPLACE FUNCTION pg_temp.recreate_entity_check(
  p_table text,
  p_column text,
  p_values text[]
) RETURNS void AS $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = p_table::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%' || quote_literal('file') || '%'
      AND pg_get_constraintdef(oid) ILIKE '%' || p_column || '%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', p_table, c.conname);
  END LOOP;

  EXECUTE format(
    'ALTER TABLE %s ADD CONSTRAINT %I CHECK (%I = ANY (%L::text[]))',
    p_table,
    format('%s_%s_check', replace(p_table, 'public.', ''), p_column),
    p_column,
    p_values
  );
END;
$$ LANGUAGE plpgsql;

-- Drop all target CHECKs up front so backfill can write 'resource'
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conrelid::regclass::text AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%''file''%'
      AND conrelid IN (
        'public.entity_links'::regclass,
        'public.entity_source_history'::regclass,
        'public.entity_evidence'::regclass,
        'public.pending_evidence'::regclass,
        'public.profile_field_provenance'::regclass,
        'public.lifecycle_events'::regclass,
        'public.salt_learnings'::regclass,
        'public.correction_events'::regclass,
        'public.workspace_tags'::regclass
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
  END LOOP;
END $$;

-- Backfill data so new CHECKs validate
UPDATE public.entity_links        SET source_type = 'resource' WHERE source_type = 'file';
UPDATE public.entity_links        SET target_type = 'resource' WHERE target_type = 'file';
UPDATE public.entity_source_history SET entity_type = 'resource' WHERE entity_type = 'file';
UPDATE public.entity_evidence     SET entity_type = 'resource' WHERE entity_type = 'file';
UPDATE public.pending_evidence    SET entity_type = 'resource' WHERE entity_type = 'file';
UPDATE public.profile_field_provenance SET entity_type = 'resource' WHERE entity_type = 'file';
UPDATE public.lifecycle_events    SET entity_type = 'resource' WHERE entity_type = 'file';
UPDATE public.salt_learnings      SET entity_type = 'resource' WHERE entity_type = 'file';
UPDATE public.correction_events   SET entity_type = 'resource' WHERE entity_type = 'file';
UPDATE public.workspace_tags      SET scope = 'resource' WHERE scope = 'file';

-- Recreate CHECKs with 'resource' in place of 'file' (constraints were dropped above)
SELECT pg_temp.recreate_entity_check(
  'public.entity_links', 'source_type',
  ARRAY['person','org','work','billing','meeting','resource','note','space']
);
SELECT pg_temp.recreate_entity_check(
  'public.entity_links', 'target_type',
  ARRAY['person','org','work','billing','meeting','resource','note','space']
);
SELECT pg_temp.recreate_entity_check(
  'public.entity_source_history', 'entity_type',
  ARRAY['person','org','work','billing','meeting','resource']
);
SELECT pg_temp.recreate_entity_check(
  'public.entity_evidence', 'entity_type',
  ARRAY['person','organization','work','meeting','resource','me','billing']
);
SELECT pg_temp.recreate_entity_check(
  'public.pending_evidence', 'entity_type',
  ARRAY['person','organization','work','billing','resource','meeting']
);
SELECT pg_temp.recreate_entity_check(
  'public.profile_field_provenance', 'entity_type',
  ARRAY['person','organization','work','operator','workspace','billing_record','meeting','resource']
);
SELECT pg_temp.recreate_entity_check(
  'public.lifecycle_events', 'entity_type',
  ARRAY['person','organization','work','operator','workspace','billing_record','meeting','resource']
);
SELECT pg_temp.recreate_entity_check(
  'public.salt_learnings', 'entity_type',
  ARRAY['person','organization','work','meeting','resource','me','billing']
);
SELECT pg_temp.recreate_entity_check(
  'public.correction_events', 'entity_type',
  ARRAY['person','organization','work','meeting','resource','me','billing']
);
SELECT pg_temp.recreate_entity_check(
  'public.workspace_tags', 'scope',
  ARRAY['person','org','work','billing','resource','all']
);

-- ---------------------------------------------------------------------------
-- 5. RLS policy names (OID-based; rename for clarity)
-- ---------------------------------------------------------------------------
ALTER POLICY "workspace_members_view_project_files"    ON public.resources RENAME TO "workspace_members_view_resources";
ALTER POLICY "workspace_members_insert_project_files"  ON public.resources RENAME TO "workspace_members_insert_resources";
ALTER POLICY "workspace_members_update_project_files"  ON public.resources RENAME TO "workspace_members_update_resources";
ALTER POLICY "workspace_members_delete_project_files"  ON public.resources RENAME TO "workspace_members_delete_resources";

ALTER POLICY "workspace_members_view_file_activities"   ON public.resource_activities RENAME TO "workspace_members_view_resource_activities";
ALTER POLICY "workspace_members_create_file_activities" ON public.resource_activities RENAME TO "workspace_members_create_resource_activities";

-- ---------------------------------------------------------------------------
-- 6. Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.resources IS 'Memory Resources: uploaded files and external/live artifacts. Product noun Resources; storage bucket bridge-files unchanged.';

COMMIT;

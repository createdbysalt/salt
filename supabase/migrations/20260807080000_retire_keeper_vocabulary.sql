-- ============================================================================
-- RETIRE "KEEPER" VOCABULARY AT THE SCHEMA LEVEL
-- ============================================================================
-- Memory Care replaced the retired Keeper system. Application code now writes
-- the "care" provenance value and normalizes legacy "keeper" rows on read
-- (see app/_features/memory/tags/normalize.ts). This migration makes the
-- schema match:
--   1. Rename the keeper_evidence_type enum (type name only; values unchanged)
--   2. Replace 'keeper' with 'care' in source/provenance CHECK vocabularies
--   3. Normalize existing rows from 'keeper' to 'care'
-- ============================================================================

-- 1. Evidence enum rename (values unchanged; no dependent code changes needed)
ALTER TYPE public.keeper_evidence_type RENAME TO memory_evidence_type;

-- 2. entity_tag_assignments.source
ALTER TABLE public.entity_tag_assignments
  DROP CONSTRAINT IF EXISTS entity_tag_assignments_source_check;
UPDATE public.entity_tag_assignments SET source = 'care' WHERE source = 'keeper';
ALTER TABLE public.entity_tag_assignments
  ADD CONSTRAINT entity_tag_assignments_source_check
  CHECK (source IN ('manual', 'care', 'system'));

-- 3. entity_links.source
ALTER TABLE public.entity_links
  DROP CONSTRAINT IF EXISTS entity_links_source_check;
UPDATE public.entity_links SET source = 'care' WHERE source = 'keeper';
ALTER TABLE public.entity_links
  ADD CONSTRAINT entity_links_source_check
  CHECK (source IN ('manual', 'care', 'system'));

-- 4. files.source (resource provenance)
-- Guarded: the column only exists where the resources extension fully applied
-- (staging skipped it).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'source'
  ) THEN
    EXECUTE 'ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_source_check';
    EXECUTE 'UPDATE public.files SET source = ''care'' WHERE source = ''keeper''';
    EXECUTE 'ALTER TABLE public.files ADD CONSTRAINT files_source_check
      CHECK (source IN (''manual'', ''care'', ''enrichment'', ''ask_salt'', ''capture''))';
  END IF;
END $$;

-- 5. record_status_source on people + organizations
ALTER TABLE public.people
  DROP CONSTRAINT IF EXISTS people_record_status_source_check;
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_record_status_source_check;
UPDATE public.people SET record_status_source = 'care' WHERE record_status_source = 'keeper';
UPDATE public.organizations SET record_status_source = 'care' WHERE record_status_source = 'keeper';
ALTER TABLE public.people
  ADD CONSTRAINT people_record_status_source_check
  CHECK (record_status_source IN ('manual', 'care'));
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_record_status_source_check
  CHECK (record_status_source IN ('manual', 'care'));

-- ============================================================================
-- EVIDENCE-BORN RESOURCES: constraint fixes
--
-- The 2026-08-29 email resource-signal backfill exposed two constraints that
-- silently rejected EVERY evidence-born resource insert (auto-create-record
-- logged the failure; the evidence row still showed action "auto"):
--
-- 1. valid_file_data required an uploaded object (object_path + size_bytes)
--    or an external link. Evidence-born resources reference the source
--    capture/email, not an uploaded object — attachment bytes never leave
--    the mail provider. System-authored rows (created_by_system = true,
--    added 20260811120000) are now exempt.
-- 2. resources_document_type_check only knew the upload-era vocabulary
--    (proposal..estimate). The email classifier emits a richer vocabulary
--    (msa, meeting_notes, revision, approval, feedback, onboarding) — every
--    one of those inserts failed the CHECK.
-- ============================================================================

BEGIN;

-- 1. System-authored resources carry no file bytes
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS valid_file_data;

ALTER TABLE public.resources
  ADD CONSTRAINT valid_file_data CHECK (
    (file_type = 'file' AND object_path IS NOT NULL AND size_bytes > 0 AND size_bytes <= 52428800)
    OR
    (file_type = 'link' AND external_url IS NOT NULL)
    OR
    created_by_system = true
  );

-- 2. Full classifier document vocabulary
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_document_type_check;

ALTER TABLE public.resources
  ADD CONSTRAINT resources_document_type_check CHECK (
    document_type IN (
      'proposal', 'contract', 'invoice', 'sow', 'nda',
      'deliverable', 'brief', 'receipt', 'estimate', 'other',
      'msa', 'meeting_notes', 'revision', 'approval', 'feedback', 'onboarding'
    )
  );

COMMIT;

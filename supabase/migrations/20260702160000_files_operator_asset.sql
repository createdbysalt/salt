-- ============================================================================
-- OPERATOR ASSET FLAG (Me Files tab)
-- ============================================================================
--
-- The Me Files tab needs an explicit marker for files that belong to the
-- operator's own business (brand kit, templates, rate cards) as opposed to
-- files attached to client records (email attachments, deliverables).
-- Without it the tab showed every workspace file.
--
-- Named is_operator_asset to match the Me record's operator_* satellite
-- naming (operator_goals, operator_memory_facts, ...).
-- ============================================================================

ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS is_operator_asset BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_project_files_operator_asset
  ON public.project_files(workspace_id)
  WHERE is_operator_asset = TRUE;

COMMENT ON COLUMN public.project_files.is_operator_asset IS
  'TRUE = belongs to the operator''s own business (shown on the Me Files tab: brand kit, templates). FALSE = a record''s file (person/org/work/email attachment).';

-- Backfill: brand assets with no record links are operator assets
-- (the only way brand_asset + fully-unlinked files exist today is the Me tab).
UPDATE public.project_files
SET is_operator_asset = TRUE
WHERE category = 'brand_asset'
  AND person_id IS NULL
  AND organization_id IS NULL
  AND project_id IS NULL
  AND client_id IS NULL;

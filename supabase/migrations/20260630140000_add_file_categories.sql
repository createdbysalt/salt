-- ============================================================================
-- ADD NEW FILE CATEGORIES
-- ============================================================================
-- Adds additional file categories: invoice, proposal, reference, media, notes, process
-- The category column is TEXT without a CHECK constraint, so this is documentation only.
-- ============================================================================

-- Update the column comment to reflect all valid categories
COMMENT ON COLUMN public.project_files.category IS 'File category for organization: brand_asset, deliverable, contract, invoice, proposal, reference, media, notes, process, screenshot, other';

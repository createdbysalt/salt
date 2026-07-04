-- ============================================================================
-- FILES BRAND METADATA (me-files-tab plan, Phase 3)
-- ============================================================================
--
-- Structured metadata for Brand Kit assets (logos, colors, fonts) stored on
-- the file row itself. Shape (BrandAssetMetadata in files/data.ts):
--   { asset_type, variant?, mode?, background?, colors?: [{hex, role?}],
--     font_family?, font_role?, resolution?: {width, height},
--     extracted_at?, extractor_version? }
-- Written by the sharp-based extractor on upload (auto) and editable by the
-- user; consumed by getBrandKitContext for AI prompts.
-- ============================================================================

ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS brand_metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_project_files_brand_metadata
  ON public.project_files USING gin(brand_metadata)
  WHERE brand_metadata IS NOT NULL;

COMMENT ON COLUMN public.project_files.brand_metadata IS
  'Structured Brand Kit metadata (asset type, extracted palette, fonts). See BrandAssetMetadata in app/_features/files/data.ts.';

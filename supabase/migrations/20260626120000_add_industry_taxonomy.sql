-- ============================================================================
-- INDUSTRY TAXONOMY
-- Migration: Add hierarchical industry classification to organizations
-- ============================================================================
--
-- Adds industry_parent (required category) and industry_child (optional subcategory)
-- to support controlled vocabulary classification. The existing `industry` TEXT
-- column is preserved for backward compatibility during migration.
--
-- ============================================================================

-- ============================================================================
-- 1. ADD INDUSTRY TAXONOMY COLUMNS
-- ============================================================================

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS industry_parent TEXT
  CHECK (industry_parent IN (
    'technology',
    'creative',
    'professional_services',
    'healthcare',
    'real_estate',
    'retail_hospitality',
    'other'
  ));

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS industry_child TEXT;

-- ============================================================================
-- 2. ADD INDEX FOR FILTERING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_industry_parent
  ON public.organizations(industry_parent)
  WHERE industry_parent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_industry_taxonomy
  ON public.organizations(industry_parent, industry_child)
  WHERE industry_parent IS NOT NULL;

-- ============================================================================
-- 3. ADD COMMENT FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.organizations.industry_parent IS
  'Top-level industry category from controlled taxonomy. See memory/types/taxonomies.ts for allowed values.';

COMMENT ON COLUMN public.organizations.industry_child IS
  'Industry subcategory. Must be valid child of industry_parent. See memory/types/taxonomies.ts.';

-- ============================================================================
-- NOTE: The existing `industry` TEXT column is preserved for backward
-- compatibility. A background job will backfill industry_parent/industry_child
-- from the free-text industry field where possible.
-- ============================================================================

-- ============================================================================
-- DONE: Industry taxonomy columns added
-- ============================================================================

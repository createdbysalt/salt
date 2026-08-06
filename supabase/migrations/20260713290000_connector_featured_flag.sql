-- Migration: Add featured flag to connector_overrides
-- Purpose: Mark connectors for prominent display in the catalog UI
-- See docs/plans/2026-07-13-scalable-connectors.md Phase 3

-- Add the column (defaults to false so synced connectors don't auto-feature)
ALTER TABLE public.connector_overrides
ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- Mark current curated connectors as featured
-- These are the connectors Salt has fully tested and recommends
UPDATE public.connector_overrides
SET featured = true
WHERE provider_key IN (
  -- Core productivity (fully supported)
  'gmail',
  'googlecalendar',
  'googledrive',
  'googledocs',
  'googlesheets',
  'googleslides',

  -- Billing (fully supported)
  'stripe',

  -- Communication (beta)
  'slack',

  -- Documents (beta)
  'notion',

  -- Calendar integrations (beta)
  'calendly',
  'cal'
);

COMMENT ON COLUMN public.connector_overrides.featured IS
  'When true, connector appears in the "Featured" section of the catalog. Salt-curated connectors.';

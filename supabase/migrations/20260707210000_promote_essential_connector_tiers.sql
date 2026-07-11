-- ============================================================================
-- Promote the essential connectors from catalog_only → action/capture tier.
-- ============================================================================
--
-- Tier gates the deep catalog sync (tools + triggers) and actionability. The
-- eight essential connectors were catalog_only, so their tools never synced —
-- their detail pages were empty (content-contract coverage flagged them).
-- Promoting them makes the sync deep-pull + auto-classify their tools, which
-- fills the pages (auto-derived overview + tool list).
--
-- Cal has a capture adapter → capture tier; the rest are action tier. All have
-- a pinned auth config already, so they also become connectable.
--
-- This persists the staging-DB flips made 2026-07-07 into code so a reseed and
-- production keep them. Idempotent.
-- ============================================================================

UPDATE public.connector_overrides SET tier = 'capture'
  WHERE provider_key = 'cal' AND tier <> 'capture';

UPDATE public.connector_overrides SET tier = 'action'
  WHERE provider_key IN (
    'quickbooks', 'calendly', 'dropbox', 'hubspot', 'notion', 'outlook', 'slack'
  ) AND tier = 'catalog_only';

DO $$
DECLARE
  still_catalog integer;
BEGIN
  SELECT count(*) INTO still_catalog
  FROM public.connector_overrides
  WHERE provider_key IN (
    'cal', 'quickbooks', 'calendly', 'dropbox', 'hubspot', 'notion', 'outlook', 'slack'
  ) AND tier = 'catalog_only';
  IF still_catalog > 0 THEN
    RAISE EXCEPTION 'expected all 8 essential connectors promoted, % still catalog_only', still_catalog;
  END IF;
END $$;

-- ============================================================================
-- connector_overrides: capture_category ⇒ capture tier (Sources plan 5.5)
--
-- The 2026-08-06 capture_category seed gave 22 providers a capture normalizer
-- but never bumped their tier, leaving 7 of them (mercury, salesforce,
-- pipedrive, linear, asana, clickup, github) at catalog_only — drift that the
-- 5.5 connectability gate would otherwise punish: a provider with a capture
-- adapter is definitionally not catalog-only. Promoting also opts them into
-- the nightly deep catalog sync (tool/trigger fetch), which capture routing
-- already assumes.
--
-- Data-only; idempotent. Rule encoded: capture capability ⇒ capture tier.
-- ============================================================================

UPDATE public.connector_overrides
SET tier = 'capture'
WHERE tier = 'catalog_only'
  AND capture_category IS NOT NULL;

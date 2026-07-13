-- ============================================================================
-- ADD CAPABILITY ENRICHMENT ENABLED FLAG (enrichment-unification plan Phase 3)
-- ============================================================================
--
-- Per AD-3: Capability-based enrichment is opt-in per connector to avoid
-- garbage extractions from raw JSON without a manifest. Only connectors with
-- explicit `capability_enrichment_enabled = true` will use the fallback path.
-- ============================================================================

ALTER TABLE public.tool_capabilities
ADD COLUMN IF NOT EXISTS capability_enrichment_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tool_capabilities.capability_enrichment_enabled IS
  'When true, this capability can be used for enrichment fallback (four-tier matching on raw JSON). Default false to avoid garbage extractions.';

-- Enable for top connectors that have proven extraction patterns
UPDATE public.tool_capabilities
SET capability_enrichment_enabled = true
WHERE provider_key IN ('gmail', 'googlecalendar', 'hubspot', 'stripe', 'quickbooks')
  AND capability_key LIKE 'search_%';

-- Post-push assertion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tool_capabilities'
      AND column_name = 'capability_enrichment_enabled'
  ) THEN
    RAISE EXCEPTION 'capability_enrichment_enabled column missing after migration';
  END IF;
END $$;

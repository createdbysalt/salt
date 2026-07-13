-- Add last_contact_at to people and organizations
-- Used for relationship health tracking in the LEARN → ACT → GROW loop

-- Add column to people
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

COMMENT ON COLUMN public.people.last_contact_at IS 'Most recent contact with this person (email sent/received, meeting attended). Updated by Keeper.';

-- Add column to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

COMMENT ON COLUMN public.organizations.last_contact_at IS 'Most recent contact with anyone at this org. Aggregated from linked people.';

-- Index for efficient "stale relationship" queries
CREATE INDEX IF NOT EXISTS idx_people_last_contact_at
  ON public.people(last_contact_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_last_contact_at
  ON public.organizations(last_contact_at)
  WHERE deleted_at IS NULL;

-- Backfill from capture_routing_decisions (most recent routed capture per person)
-- Note: capture_events links to people via routing_decisions.target_entity_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'capture_routing_decisions'
  ) THEN
    -- Update people with their most recent routed capture
    UPDATE public.people p
    SET last_contact_at = sub.max_routed_at
    FROM (
      SELECT
        crd.target_entity_id,
        MAX(crd.routed_at) as max_routed_at
      FROM public.capture_routing_decisions crd
      WHERE crd.target_surface = 'people'
        AND crd.target_entity_id IS NOT NULL
        AND crd.routed_at IS NOT NULL
      GROUP BY crd.target_entity_id
    ) sub
    WHERE p.id = sub.target_entity_id
      AND p.last_contact_at IS NULL;

    -- Update organizations from their linked people
    UPDATE public.organizations o
    SET last_contact_at = sub.max_last_contacted
    FROM (
      SELECT
        op.organization_id,
        MAX(p.last_contact_at) as max_last_contacted
      FROM public.organization_people op
      JOIN public.people p ON p.id = op.person_id
      WHERE p.last_contact_at IS NOT NULL
      GROUP BY op.organization_id
    ) sub
    WHERE o.id = sub.organization_id
      AND o.last_contact_at IS NULL;
  END IF;
END $$;

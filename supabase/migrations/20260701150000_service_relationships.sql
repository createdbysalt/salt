-- ============================================================================
-- Service Relationships: Links services for upsells, bundles, and cross-sells
-- ============================================================================
-- Junction table connecting workspace_services to each other with typed
-- relationships. Enables Plays to recommend follow-on services, suggest
-- bundles, and identify alternatives.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.service_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys (both point to workspace_services)
  service_id UUID NOT NULL REFERENCES public.workspace_services(id) ON DELETE CASCADE,
  related_service_id UUID NOT NULL REFERENCES public.workspace_services(id) ON DELETE CASCADE,

  -- Relationship type
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'follow_on',        -- "After Brand Identity, clients typically need Web Design"
    'prerequisite',     -- "Strategy must come before Brand Identity"
    'substitute',       -- "Web Refresh is an alternative to Full Redesign"
    'complement',       -- "SEO Audit enhances value of Web Design"
    'bundle_component'  -- "This service is part of the Brand Package bundle"
  )),

  -- Relationship strength and context
  strength INTEGER NOT NULL DEFAULT 50 CHECK (strength >= 0 AND strength <= 100),
  typical_gap_days INTEGER,  -- For follow-ons: typical days between services
  recommendation_note TEXT,  -- Why Salt should recommend this pairing

  -- AI provenance
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_proposed', 'ai_learned')),

  -- Display
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(service_id, related_service_id, relationship_type),
  CHECK (service_id != related_service_id)  -- Can't relate to self
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_relationships_service
  ON public.service_relationships(service_id);

CREATE INDEX IF NOT EXISTS idx_service_relationships_related
  ON public.service_relationships(related_service_id);

CREATE INDEX IF NOT EXISTS idx_service_relationships_type
  ON public.service_relationships(relationship_type);

-- ─── Updated At Trigger ─────────────────────────────────────────────────────
CREATE TRIGGER set_service_relationships_updated_at
  BEFORE UPDATE ON public.service_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.service_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_service_relationships"
  ON public.service_relationships FOR SELECT
  USING (
    service_id IN (
      SELECT id FROM public.workspace_services
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "workspace_admins_manage_service_relationships"
  ON public.service_relationships FOR ALL
  USING (
    service_id IN (
      SELECT id FROM public.workspace_services
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    service_id IN (
      SELECT id FROM public.workspace_services
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- ─── Grants ─────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_relationships TO authenticated;

-- ─── Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE public.service_relationships IS
  'Links services for upsells, bundles, cross-sells. Used by Plays to recommend related services.';

COMMENT ON COLUMN public.service_relationships.relationship_type IS
  'follow_on = recommend after, prerequisite = must come before, substitute = alternative, complement = enhances value, bundle_component = part of package';

COMMENT ON COLUMN public.service_relationships.strength IS
  '0-100 affinity score. Higher = stronger recommendation signal for Plays.';

COMMENT ON COLUMN public.service_relationships.typical_gap_days IS
  'For follow_on relationships: typical days between completing first service and starting second.';

COMMENT ON COLUMN public.service_relationships.source IS
  'manual = operator created, ai_proposed = Salt suggested, ai_learned = Salt learned from patterns';

-- ============================================================================
-- Service ICP Mappings: Links services to ICP segments
-- ============================================================================
-- Junction table connecting workspace_services to workspace_icp_segments.
-- Includes fit_score (1-5) indicating how well a service fits an ICP.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.service_icp_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  service_id UUID NOT NULL REFERENCES public.workspace_services(id) ON DELETE CASCADE,
  icp_segment_id UUID NOT NULL REFERENCES public.workspace_icp_segments(id) ON DELETE CASCADE,

  -- Fit assessment
  fit_score INTEGER NOT NULL DEFAULT 3 CHECK (fit_score >= 1 AND fit_score <= 5),

  -- AI provenance
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_proposed')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(service_id, icp_segment_id)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_icp_mappings_service
  ON public.service_icp_mappings(service_id);

CREATE INDEX IF NOT EXISTS idx_service_icp_mappings_icp
  ON public.service_icp_mappings(icp_segment_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.service_icp_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_service_icp_mappings"
  ON public.service_icp_mappings FOR SELECT
  USING (
    service_id IN (
      SELECT id FROM public.workspace_services
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "workspace_members_manage_service_icp_mappings"
  ON public.service_icp_mappings FOR ALL
  USING (
    service_id IN (
      SELECT id FROM public.workspace_services
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    service_id IN (
      SELECT id FROM public.workspace_services
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- ─── Grants ─────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_icp_mappings TO authenticated;

-- ─── Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE public.service_icp_mappings IS
  'Links services to ICP segments with fit scores. Used to recommend services for ICP-matched contacts.';

COMMENT ON COLUMN public.service_icp_mappings.fit_score IS
  '1-5 rating of how well this service fits this ICP (5 = perfect fit)';

COMMENT ON COLUMN public.service_icp_mappings.source IS
  'manual = user linked, ai_proposed = Salt suggested based on patterns';

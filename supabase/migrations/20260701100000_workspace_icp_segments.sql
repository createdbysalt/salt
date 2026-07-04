-- ============================================================================
-- ICP Segments: Ideal Customer Profile definitions
-- ============================================================================
-- Workspace-scoped ICP segments that Salt uses to identify ideal clients.
-- Salt proposes segments based on patterns; users confirm or dismiss.
-- ============================================================================

-- ─── Create workspace_icp_segments table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_icp_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Core identity
  name TEXT NOT NULL,
  description TEXT,

  -- Pain points and outcomes (what they struggle with, what they want)
  pain_points TEXT[] DEFAULT '{}',
  desired_outcomes TEXT[] DEFAULT '{}',

  -- Budget and sizing
  budget_signal TEXT,
  target_company_size TEXT CHECK (target_company_size IS NULL OR target_company_size IN (
    'solo', '2-10', '11-50', '51-200', '200+'
  )),
  min_project_value_cents BIGINT,

  -- Industry targeting (references industry taxonomy)
  target_industry TEXT,

  -- Qualification signals
  qualifying_signals TEXT[] DEFAULT '{}',
  disqualifying_signals TEXT[] DEFAULT '{}',

  -- AI provenance
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'proposed', 'dismissed')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_capture')),
  confidence INTEGER CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),

  -- Display
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_icp_segments_workspace
  ON public.workspace_icp_segments(workspace_id);

CREATE INDEX IF NOT EXISTS idx_icp_segments_workspace_active
  ON public.workspace_icp_segments(workspace_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_icp_segments_workspace_proposed
  ON public.workspace_icp_segments(workspace_id, status)
  WHERE status = 'proposed';

-- ─── Updated_at trigger ─────────────────────────────────────────────────────
CREATE TRIGGER workspace_icp_segments_updated_at
  BEFORE UPDATE ON public.workspace_icp_segments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.workspace_icp_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_icp_segments"
  ON public.workspace_icp_segments FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_manage_icp_segments"
  ON public.workspace_icp_segments FOR ALL
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- ─── Grants ─────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_icp_segments TO authenticated;

-- ─── Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE public.workspace_icp_segments IS
  'Ideal Customer Profile segments. Salt proposes segments based on client patterns; users confirm.';

COMMENT ON COLUMN public.workspace_icp_segments.pain_points IS
  'Array of pain points this ICP experiences (e.g., "Outgrew DIY branding")';

COMMENT ON COLUMN public.workspace_icp_segments.desired_outcomes IS
  'Array of outcomes this ICP wants (e.g., "Investor-ready brand")';

COMMENT ON COLUMN public.workspace_icp_segments.qualifying_signals IS
  'Signals that indicate someone matches this ICP (e.g., "Recently raised funding")';

COMMENT ON COLUMN public.workspace_icp_segments.disqualifying_signals IS
  'Red flags that indicate someone does NOT match (e.g., "Budget under $5k")';

COMMENT ON COLUMN public.workspace_icp_segments.status IS
  'active = confirmed ICP, proposed = Salt suggested, dismissed = user rejected';

COMMENT ON COLUMN public.workspace_icp_segments.source IS
  'manual = user created, ai_capture = Salt proposed from patterns';

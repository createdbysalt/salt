-- ============================================================================
-- Contact ICP Matches: Links people/orgs to ICP segments they match
-- ============================================================================
-- Junction table that records when Salt identifies a contact as matching an
-- ICP segment. Salt proposes matches; users confirm or dismiss.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_icp_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Polymorphic reference to person or organization
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'organization')),
  entity_id UUID NOT NULL,

  -- ICP segment reference
  icp_segment_id UUID NOT NULL REFERENCES public.workspace_icp_segments(id) ON DELETE CASCADE,

  -- Match assessment
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_signals JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'dismissed')),
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(entity_type, entity_id, icp_segment_id)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contact_icp_matches_workspace
  ON public.contact_icp_matches(workspace_id);

CREATE INDEX IF NOT EXISTS idx_contact_icp_matches_entity
  ON public.contact_icp_matches(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_contact_icp_matches_icp
  ON public.contact_icp_matches(icp_segment_id);

CREATE INDEX IF NOT EXISTS idx_contact_icp_matches_status
  ON public.contact_icp_matches(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_contact_icp_matches_proposed
  ON public.contact_icp_matches(workspace_id, status, proposed_at DESC)
  WHERE status = 'proposed';

CREATE INDEX IF NOT EXISTS idx_contact_icp_matches_score
  ON public.contact_icp_matches(workspace_id, match_score DESC)
  WHERE status IN ('proposed', 'confirmed');

-- ─── Updated_at trigger ─────────────────────────────────────────────────────
CREATE TRIGGER contact_icp_matches_updated_at
  BEFORE UPDATE ON public.contact_icp_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.contact_icp_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_contact_icp_matches"
  ON public.contact_icp_matches FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_manage_contact_icp_matches"
  ON public.contact_icp_matches FOR ALL
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- ─── Grants ─────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_icp_matches TO authenticated;

-- ─── Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE public.contact_icp_matches IS
  'Records when Salt identifies a contact (person/org) as matching an ICP segment. Users confirm or dismiss.';

COMMENT ON COLUMN public.contact_icp_matches.entity_type IS
  'Type of entity: "person" or "organization"';

COMMENT ON COLUMN public.contact_icp_matches.match_score IS
  '0-100 score indicating strength of match against ICP criteria';

COMMENT ON COLUMN public.contact_icp_matches.match_signals IS
  'Breakdown of why this matched: {"industry": 30, "budget": 25, "engagement": 20, "outcome": 12}';

COMMENT ON COLUMN public.contact_icp_matches.status IS
  'proposed = Salt suggested, confirmed = user verified, dismissed = user rejected';

COMMENT ON COLUMN public.contact_icp_matches.resolved_at IS
  'When the user confirmed or dismissed this match';

COMMENT ON COLUMN public.contact_icp_matches.resolved_by IS
  'User who confirmed or dismissed this match';

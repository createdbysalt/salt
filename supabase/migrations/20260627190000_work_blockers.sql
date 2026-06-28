-- Work Blockers: Salt-maintained blockers for work health scoring
-- Salt infers blockers from signals (email, calendar, activity patterns)
-- Users can confirm/dismiss to help Salt learn

CREATE TABLE IF NOT EXISTS public.work_blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Blocker details
  blocker_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,

  -- Source/evidence
  source TEXT NOT NULL DEFAULT 'salt_inferred',
  source_entity_type TEXT,
  source_entity_id UUID,
  confidence NUMERIC(3,2),

  -- State
  status TEXT NOT NULL DEFAULT 'active',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_note TEXT,

  -- Timestamps
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_blocker_type CHECK (
    blocker_type IN (
      'awaiting_reply',
      'meeting_cancelled',
      'approval_pending',
      'asset_pending',
      'payment_pending',
      'dependency',
      'resource_unavailable',
      'custom'
    )
  ),
  CONSTRAINT valid_blocker_source CHECK (
    source IN ('salt_inferred', 'user_flagged')
  ),
  CONSTRAINT valid_blocker_status CHECK (
    status IN ('active', 'resolved', 'dismissed')
  ),
  CONSTRAINT valid_confidence CHECK (
    confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_blockers_workspace ON public.work_blockers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_work_blockers_work ON public.work_blockers(work_id);
CREATE INDEX IF NOT EXISTS idx_work_blockers_status ON public.work_blockers(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_work_blockers_source_entity ON public.work_blockers(source_entity_type, source_entity_id) WHERE source_entity_id IS NOT NULL;

-- RLS
ALTER TABLE public.work_blockers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blockers in their workspace"
  ON public.work_blockers FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert blockers in their workspace"
  ON public.work_blockers FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update blockers in their workspace"
  ON public.work_blockers FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete blockers in their workspace"
  ON public.work_blockers FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Service role bypass for Salt AI operations
CREATE POLICY "Service role has full access to blockers"
  ON public.work_blockers FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
CREATE TRIGGER set_work_blockers_updated_at
  BEFORE UPDATE ON public.work_blockers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_blockers TO authenticated;
GRANT ALL ON public.work_blockers TO service_role;

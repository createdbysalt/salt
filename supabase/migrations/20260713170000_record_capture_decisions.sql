-- Record Capture Engine Phase 3: Outcome Tracking
-- Logs all CREATE/WATCH/NOTHING decisions and their outcomes for calibration.

CREATE TABLE record_capture_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  capture_event_id UUID NOT NULL REFERENCES capture_events(id) ON DELETE CASCADE,

  -- Decision made by the criteria engine
  decision_tier TEXT NOT NULL CHECK (decision_tier IN ('create', 'watch', 'nothing')),
  decision_reason TEXT NOT NULL,

  -- Input signals that led to the decision
  admission_score INTEGER,
  admission_signals JSONB,
  had_linked_records BOOLEAN NOT NULL DEFAULT FALSE,
  sender_classification TEXT,
  sender_email TEXT,
  sender_domain TEXT,

  -- For CREATE decisions: what was proposed
  proposal_surface TEXT,  -- 'people', 'orgs'
  proposal_confidence INTEGER,

  -- For WATCH decisions: what is being watched
  watch_type TEXT,  -- 'email', 'domain'
  watch_target TEXT,
  watch_expression_id UUID REFERENCES entity_watch_expressions(id) ON DELETE SET NULL,

  -- Outcome tracking (filled later when user acts)
  outcome TEXT CHECK (outcome IN ('approved', 'rejected', 'ignored', 'auto_applied', 'graduated', 'expired')),
  outcome_at TIMESTAMPTZ,
  outcome_by UUID REFERENCES auth.users(id),
  entity_created_id UUID,  -- UUID of the Person/Org created (if approved)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying decisions by workspace and tier
CREATE INDEX idx_rcd_workspace_tier ON record_capture_decisions(workspace_id, decision_tier);

-- Index for querying decisions by capture event
CREATE INDEX idx_rcd_capture_event ON record_capture_decisions(capture_event_id);

-- Index for calibration queries (decisions with outcomes)
CREATE INDEX idx_rcd_outcome ON record_capture_decisions(outcome) WHERE outcome IS NOT NULL;

-- Index for watch expression tracking
CREATE INDEX idx_rcd_watch_expression ON record_capture_decisions(watch_expression_id)
  WHERE watch_expression_id IS NOT NULL;

-- RLS: workspace members can read/write their workspace's decisions
ALTER TABLE record_capture_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view decisions"
  ON record_capture_decisions
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage decisions"
  ON record_capture_decisions
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- Comments
COMMENT ON TABLE record_capture_decisions IS
  'Tracks CREATE/WATCH/NOTHING decisions from the Record Capture Engine for calibration and outcome analysis';

COMMENT ON COLUMN record_capture_decisions.decision_tier IS
  'The tier decision: create (propose record), watch (accumulate signals), nothing (drop)';

COMMENT ON COLUMN record_capture_decisions.outcome IS
  'What happened to this decision: approved (record created), rejected (user dismissed), ignored (no action), auto_applied (confidence was high enough), graduated (watch became create), expired (watch timed out)';

COMMENT ON COLUMN record_capture_decisions.entity_created_id IS
  'UUID of the Person or Organization record created if the proposal was approved';

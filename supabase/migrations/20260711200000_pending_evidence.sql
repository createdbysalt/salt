-- Evidence accumulation for proactive record intake
-- Implements Fellegi-Sunter log-odds scoring for detecting new records from captures

-- Pending evidence for potential records (not yet created)
CREATE TABLE IF NOT EXISTS pending_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- What we're tracking
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'organization', 'work', 'billing', 'file', 'meeting')),
  identifier TEXT NOT NULL, -- canonical key (email, domain, etc.)

  -- Evidence accumulation (Fellegi-Sunter log-odds)
  log_odds_score NUMERIC(10, 4) NOT NULL DEFAULT 0,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'watching' CHECK (status IN ('watching', 'suggested', 'created', 'dismissed')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signal_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Extracted data (grows with each signal)
  extracted_fields JSONB NOT NULL DEFAULT '{}',

  -- If this was converted to a record
  created_record_id UUID, -- references the created person/org/work/etc
  created_at TIMESTAMPTZ,

  -- Dismissal tracking
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,

  -- Constraints
  UNIQUE(workspace_id, entity_type, identifier)
);

-- Index for quick lookups
CREATE INDEX idx_pending_evidence_workspace_status
  ON pending_evidence(workspace_id, status);

CREATE INDEX idx_pending_evidence_workspace_type
  ON pending_evidence(workspace_id, entity_type);

CREATE INDEX idx_pending_evidence_score
  ON pending_evidence(log_odds_score DESC);

-- Individual signals that contributed to the evidence
CREATE TABLE IF NOT EXISTS pending_evidence_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES pending_evidence(id) ON DELETE CASCADE,

  -- Signal details
  signal TEXT NOT NULL,
  weight NUMERIC(6, 2) NOT NULL,
  capture_id UUID, -- optional reference to capture_events

  -- Extracted data from this signal
  extracted_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pending_evidence_signals_evidence
  ON pending_evidence_signals(evidence_id);

-- RLS policies
ALTER TABLE pending_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_evidence_signals ENABLE ROW LEVEL SECURITY;

-- Workspace members can view pending evidence
CREATE POLICY pending_evidence_workspace_read ON pending_evidence
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Workspace members can insert/update pending evidence
CREATE POLICY pending_evidence_workspace_write ON pending_evidence
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Signals inherit from evidence
CREATE POLICY pending_evidence_signals_read ON pending_evidence_signals
  FOR SELECT
  USING (
    evidence_id IN (
      SELECT id FROM pending_evidence
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY pending_evidence_signals_write ON pending_evidence_signals
  FOR ALL
  USING (
    evidence_id IN (
      SELECT id FROM pending_evidence
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Comments
COMMENT ON TABLE pending_evidence IS 'Accumulated evidence for potential records that may be created. Uses Fellegi-Sunter log-odds scoring.';
COMMENT ON COLUMN pending_evidence.log_odds_score IS 'Cumulative log-odds score. Higher = more confident this should be a record.';
COMMENT ON COLUMN pending_evidence.identifier IS 'Canonical identifier for dedup (email for person, domain for org, etc.)';
COMMENT ON COLUMN pending_evidence.extracted_fields IS 'Fields extracted from signals, merged. Each field has value, confidence, sources.';

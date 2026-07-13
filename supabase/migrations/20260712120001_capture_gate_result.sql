-- Captures V2 Phase 2: Gate pipeline audit trail
-- Stores the gate pipeline result for each capture for debugging and analytics.

ALTER TABLE capture_events
  ADD COLUMN gate_action TEXT,
  ADD COLUMN gate_result JSONB;

COMMENT ON COLUMN capture_events.gate_action IS 'Gate pipeline final action: drop, signal, candidate, noise, or null (legacy)';
COMMENT ON COLUMN capture_events.gate_result IS 'Full gate pipeline result for audit: which gates passed, match details, scores';

-- Index for filtering by gate action (e.g., find all noise captures)
CREATE INDEX idx_capture_events_gate_action ON capture_events (workspace_id, gate_action)
  WHERE gate_action IS NOT NULL;

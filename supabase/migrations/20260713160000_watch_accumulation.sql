-- Record Capture Engine Phase 2: Watch Accumulation
-- Adds support for "pending contact" watches that accumulate signals
-- before graduating to a record creation proposal.

-- Add watch_purpose to distinguish entity watches from pending contact watches
ALTER TABLE entity_watch_expressions
  ADD COLUMN IF NOT EXISTS watch_purpose TEXT DEFAULT 'existing_entity'
    CHECK (watch_purpose IN ('existing_entity', 'pending_contact'));

-- Add accumulated_signals to track signals from multiple captures
ALTER TABLE entity_watch_expressions
  ADD COLUMN IF NOT EXISTS accumulated_signals JSONB DEFAULT '[]'::jsonb;

-- Add capture_count to track how many captures have matched this watch
ALTER TABLE entity_watch_expressions
  ADD COLUMN IF NOT EXISTS capture_count INTEGER DEFAULT 0;

-- Add initial_reason to track why this watch was created
ALTER TABLE entity_watch_expressions
  ADD COLUMN IF NOT EXISTS initial_reason TEXT;

-- Index for finding pending contacts that might graduate
CREATE INDEX IF NOT EXISTS idx_watch_pending_contacts
  ON entity_watch_expressions (workspace_id, watch_purpose, capture_count)
  WHERE watch_purpose = 'pending_contact';

-- Comments
COMMENT ON COLUMN entity_watch_expressions.watch_purpose IS
  'existing_entity = tracking known Person/Org; pending_contact = accumulating signals before proposing record creation';

COMMENT ON COLUMN entity_watch_expressions.accumulated_signals IS
  'JSON array of {type, weight, evidence, captured_at} from each matching capture';

COMMENT ON COLUMN entity_watch_expressions.capture_count IS
  'Number of captures that have matched this watch expression';

COMMENT ON COLUMN entity_watch_expressions.initial_reason IS
  'Why this watch was created (e.g. "You initiated contact, awaiting reply")';

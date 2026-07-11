-- Correction Events (Confidence-Gated Keeper Execution Phase 6)
--
-- Records user corrections to keeper auto-executes. Used to:
-- 1. Revert incorrect changes
-- 2. Apply confidence penalties to prevent repeats
-- 3. Learn patterns from explanations
--
-- Three correction intensities:
-- - Quick undo: minimal signal (-10 confidence)
-- - Structured reason: medium signal (-30 confidence)
-- - Conversational: full context (variable penalty + pattern learning)

-- Correction types
CREATE TYPE correction_type AS ENUM (
  'quick_undo',           -- One-click undo, minimal context
  'structured_reason',    -- Selected from predefined options
  'conversational'        -- Explained via Ask Salt
);

-- Structured reason categories
CREATE TYPE correction_reason AS ENUM (
  'wrong_value',          -- Value is incorrect (e.g., wrong role)
  'wrong_entity',         -- Applied to wrong person/org
  'wrong_timing',         -- True before, not anymore
  'never_true',           -- Was never correct
  'too_aggressive',       -- Confidence was too high for this case
  'context_missing',      -- Salt lacked necessary context
  'other'                 -- User provided custom explanation
);

CREATE TABLE correction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- What was corrected
  learning_id UUID REFERENCES salt_learnings(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_path TEXT NOT NULL,

  -- The incorrect change
  wrong_value JSONB NOT NULL,
  correct_value JSONB,  -- null if "just wrong, don't know correct"

  -- Correction details
  correction_type correction_type NOT NULL,
  correction_reason correction_reason,
  user_explanation TEXT,  -- Free-form explanation (from structured or conversational)

  -- Learning signals extracted from explanation
  extracted_patterns JSONB DEFAULT '[]'::jsonb,
  -- e.g., [{"pattern": "accountant_not_client", "entities": ["jane@acme.com"]}]

  -- Confidence penalty applied
  confidence_penalty SMALLINT NOT NULL DEFAULT 10,
  -- Quick undo = 10, structured = 30, conversational = varies

  -- Tracking
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Whether this correction created a memory fact
  resulting_fact_id UUID,  -- References operator_memory_facts if pattern was learned

  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'person', 'organization', 'work', 'meeting', 'file', 'me', 'billing'
  ))
);

-- Primary lookup: corrections for a learning
CREATE INDEX idx_correction_events_learning
  ON correction_events(learning_id)
  WHERE learning_id IS NOT NULL;

-- Entity lookup: all corrections for an entity
CREATE INDEX idx_correction_events_entity
  ON correction_events(workspace_id, entity_type, entity_id);

-- Pattern analysis: corrections by field
CREATE INDEX idx_correction_events_field
  ON correction_events(workspace_id, field_path);

-- Time-based analysis
CREATE INDEX idx_correction_events_created
  ON correction_events(workspace_id, created_at DESC);

-- RLS
ALTER TABLE correction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace corrections"
  ON correction_events FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert corrections in their workspace"
  ON correction_events FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

-- Service role bypass
CREATE POLICY "Service role full access"
  ON correction_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE correction_events IS
'User corrections to keeper auto-executes. Used for confidence decay and pattern learning.';

COMMENT ON COLUMN correction_events.confidence_penalty IS
'Penalty applied to future similar predictions. Decays: 1st=-50%, 2nd=-33%, etc.';

COMMENT ON COLUMN correction_events.extracted_patterns IS
'Patterns extracted from user explanation (e.g., "Jane is my accountant" → accountant_role pattern).';

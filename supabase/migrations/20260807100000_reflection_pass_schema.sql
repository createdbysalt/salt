-- Memory Reflection Pass Schema (P8 Pattern-Level Learning)
--
-- Enables "teach the system" learning: corrections cluster by signal source
-- and field type, downweighting unreliable sources over time.
--
-- Architecture:
-- 1. reflection_triggers: tracks when reflection should run per category
-- 2. signal_source_weights: learned adjustments to signal reliability
--
-- Decision pipeline reads weights when calculating confidence:
--   adjustedConfidence = baseConfidence * sourceWeight
--
-- Weight floor: 0.5 (source stays useful, just cautious)
-- Trigger threshold: 5 corrections in a category

-- =============================================================================
-- Table: reflection_triggers
-- =============================================================================
-- Tracks correction counts per category to determine when reflection passes
-- should run. A "category" is a signal_source+field_type combo.

CREATE TABLE reflection_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Category is the signal_source+field_type combo
  -- e.g., "email_signature:role" or "calendar_invite:company_name"
  category TEXT NOT NULL,

  -- Counter incremented on each correction; reset after reflection
  correction_count INT NOT NULL DEFAULT 0,

  -- When reflection last ran for this category
  last_reflected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, category)
);

-- Lookup by workspace for batch reflection
CREATE INDEX idx_reflection_triggers_workspace
  ON reflection_triggers(workspace_id);

-- Find categories that need reflection (count >= threshold)
CREATE INDEX idx_reflection_triggers_pending
  ON reflection_triggers(workspace_id, correction_count)
  WHERE correction_count >= 5;

-- RLS
ALTER TABLE reflection_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace triggers"
  ON reflection_triggers FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their workspace triggers"
  ON reflection_triggers FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access on reflection_triggers"
  ON reflection_triggers FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE reflection_triggers IS
'Tracks correction counts by signal_source+field_type category. Triggers reflection pass at 5 corrections.';

COMMENT ON COLUMN reflection_triggers.category IS
'Combined signal_source:field_type key, e.g., "email_signature:role"';

-- =============================================================================
-- Table: signal_source_weights
-- =============================================================================
-- Learned adjustments to signal source reliability. Decision pipeline reads
-- these when calculating adjusted confidence for a proposal.

CREATE TABLE signal_source_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- The signal source that has been downweighted
  signal_source TEXT NOT NULL,

  -- The field type this applies to (role, company_name, industry, etc.)
  field_type TEXT NOT NULL,

  -- Weight multiplier: 1.0 = no adjustment, 0.5 = minimum (floor)
  -- Formula: weight = max(0.5, 1 - (correction_count * 0.1))
  weight_adjustment DECIMAL(3,2) NOT NULL DEFAULT 1.00
    CHECK (weight_adjustment >= 0.50 AND weight_adjustment <= 1.00),

  -- Total corrections that led to this weight
  correction_count INT NOT NULL DEFAULT 0,

  -- Audit trail
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, signal_source, field_type)
);

-- Primary lookup: get weight for a specific source+field combo
CREATE INDEX idx_signal_source_weights_lookup
  ON signal_source_weights(workspace_id, signal_source, field_type);

-- RLS
ALTER TABLE signal_source_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace weights"
  ON signal_source_weights FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their workspace weights"
  ON signal_source_weights FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access on signal_source_weights"
  ON signal_source_weights FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE signal_source_weights IS
'Learned confidence adjustments per signal source and field type. P8 pattern-level learning.';

COMMENT ON COLUMN signal_source_weights.weight_adjustment IS
'Multiplier applied to base confidence. Floor 0.5, ceiling 1.0. Formula: max(0.5, 1 - corrections*0.1)';

-- =============================================================================
-- Add signal_source to correction_events (for clustering)
-- =============================================================================
-- The correction_events table exists but doesn't track which signal source
-- produced the wrong value. Adding this enables correction clustering.

ALTER TABLE correction_events
  ADD COLUMN IF NOT EXISTS signal_source TEXT;

-- Index for clustering corrections by source+field
CREATE INDEX IF NOT EXISTS idx_correction_events_clustering
  ON correction_events(workspace_id, signal_source, field_path)
  WHERE signal_source IS NOT NULL;

COMMENT ON COLUMN correction_events.signal_source IS
'Signal source that produced the incorrect value (gmail, email_signature, calendar_invite, etc.)';

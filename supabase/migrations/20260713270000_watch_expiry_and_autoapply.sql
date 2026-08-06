-- Record Capture Engine: Watch Expiry + Auto-Apply Calibration Gate
--
-- Adds:
-- 1. expires_at column for 30-day watch expiry with activity reset
-- 2. workspace_capture_settings table for auto-apply gate configuration

-- =============================================================================
-- Part 1: Watch Expiry
-- =============================================================================

-- Add expires_at to track when watches should be cleaned up
ALTER TABLE entity_watch_expressions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Set default expiry for new pending_contact watches (30 days from creation)
-- existing_entity watches don't expire
CREATE OR REPLACE FUNCTION set_watch_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.watch_purpose = 'pending_contact' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_watch_expiry ON entity_watch_expressions;
CREATE TRIGGER trg_set_watch_expiry
  BEFORE INSERT ON entity_watch_expressions
  FOR EACH ROW
  EXECUTE FUNCTION set_watch_expiry();

-- Reset expiry on activity (when capture_count increments or last_matched_at updates)
CREATE OR REPLACE FUNCTION reset_watch_expiry_on_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.watch_purpose = 'pending_contact' THEN
    -- Reset to 30 days from now on any activity
    IF (OLD.capture_count IS DISTINCT FROM NEW.capture_count) OR
       (OLD.last_matched_at IS DISTINCT FROM NEW.last_matched_at) THEN
      NEW.expires_at := NOW() + INTERVAL '30 days';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reset_watch_expiry ON entity_watch_expressions;
CREATE TRIGGER trg_reset_watch_expiry
  BEFORE UPDATE ON entity_watch_expressions
  FOR EACH ROW
  EXECUTE FUNCTION reset_watch_expiry_on_activity();

-- Index for finding expired watches to clean up
CREATE INDEX IF NOT EXISTS idx_watch_expires_at
  ON entity_watch_expressions (expires_at)
  WHERE watch_purpose = 'pending_contact' AND expires_at IS NOT NULL;

-- Set expiry for existing pending_contact watches (30 days from last activity or creation)
UPDATE entity_watch_expressions
SET expires_at = COALESCE(last_matched_at, created_at) + INTERVAL '30 days'
WHERE watch_purpose = 'pending_contact' AND expires_at IS NULL;

COMMENT ON COLUMN entity_watch_expressions.expires_at IS
  'When this watch expires (pending_contact only). Reset to +30 days on any activity.';

-- =============================================================================
-- Part 2: Auto-Apply Calibration Gate
-- =============================================================================

-- Workspace-level capture settings for earned autonomy
CREATE TABLE IF NOT EXISTS workspace_capture_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Auto-apply gate (earned through calibration)
  auto_apply_enabled BOOLEAN DEFAULT FALSE,
  auto_apply_threshold INTEGER DEFAULT 95,
  auto_apply_min_proposals INTEGER DEFAULT 50,
  auto_apply_min_approval_rate NUMERIC(3,2) DEFAULT 0.90,
  auto_apply_earned_at TIMESTAMPTZ,

  -- Calibration snapshot (updated periodically)
  calibration_proposal_count INTEGER DEFAULT 0,
  calibration_approval_rate NUMERIC(3,2),
  calibration_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workspace_capture_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_capture_settings" ON workspace_capture_settings
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "workspace_admins_manage_capture_settings" ON workspace_capture_settings
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

COMMENT ON TABLE workspace_capture_settings IS
  'Workspace-level settings for record capture engine. Auto-apply is earned through demonstrated accuracy.';

COMMENT ON COLUMN workspace_capture_settings.auto_apply_enabled IS
  'Whether high-confidence CREATE proposals auto-apply without approval. Earned via calibration gate.';

COMMENT ON COLUMN workspace_capture_settings.auto_apply_threshold IS
  'Minimum confidence (0-100) required for auto-apply. Default 95.';

COMMENT ON COLUMN workspace_capture_settings.auto_apply_min_proposals IS
  'Minimum proposals with outcomes before auto-apply can be earned. Default 50.';

COMMENT ON COLUMN workspace_capture_settings.auto_apply_min_approval_rate IS
  'Minimum approval rate (0.00-1.00) to earn auto-apply. Default 0.90 (90%).';

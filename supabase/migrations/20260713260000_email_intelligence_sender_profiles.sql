-- Email Intelligence Layer: Extended Sender Profiles
-- Adds reputation tracking fields to capture_sender_profiles for behavioral learning.
-- See: docs/plans/2026-07-13-email-intelligence-layer.md

-- Add email type classification
ALTER TABLE capture_sender_profiles
ADD COLUMN IF NOT EXISTS email_type TEXT DEFAULT 'unknown';

COMMENT ON COLUMN capture_sender_profiles.email_type IS
  'Email type classification: personal, transactional, promotional, automated, unknown';

-- Add response rate tracking
ALTER TABLE capture_sender_profiles
ADD COLUMN IF NOT EXISTS response_rate NUMERIC(5,4);

COMMENT ON COLUMN capture_sender_profiles.response_rate IS
  'User response rate to this sender (0.0000-1.0000)';

-- Add average response time
ALTER TABLE capture_sender_profiles
ADD COLUMN IF NOT EXISTS avg_response_time_hours INTEGER;

COMMENT ON COLUMN capture_sender_profiles.avg_response_time_hours IS
  'Average hours to respond to this sender';

-- Add capture count
ALTER TABLE capture_sender_profiles
ADD COLUMN IF NOT EXISTS capture_count INTEGER DEFAULT 0;

COMMENT ON COLUMN capture_sender_profiles.capture_count IS
  'Total captures received from this sender';

-- Add user archived count
ALTER TABLE capture_sender_profiles
ADD COLUMN IF NOT EXISTS user_archived_count INTEGER DEFAULT 0;

COMMENT ON COLUMN capture_sender_profiles.user_archived_count IS
  'Number of times user archived emails from this sender';

-- Add user replied count
ALTER TABLE capture_sender_profiles
ADD COLUMN IF NOT EXISTS user_replied_count INTEGER DEFAULT 0;

COMMENT ON COLUMN capture_sender_profiles.user_replied_count IS
  'Number of times user replied to emails from this sender';

-- Add reputation score
ALTER TABLE capture_sender_profiles
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 50;

COMMENT ON COLUMN capture_sender_profiles.reputation_score IS
  'Sender reputation score (0-100), adjusted by user behavior';

-- Add last calculated timestamp
ALTER TABLE capture_sender_profiles
ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMPTZ;

COMMENT ON COLUMN capture_sender_profiles.last_calculated_at IS
  'When reputation metrics were last recalculated';

-- Create training feedback table for explicit user corrections
CREATE TABLE IF NOT EXISTS capture_training_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  capture_event_id UUID REFERENCES capture_events(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  sender_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capture_training_feedback_workspace
  ON capture_training_feedback(workspace_id);
CREATE INDEX IF NOT EXISTS idx_capture_training_feedback_sender
  ON capture_training_feedback(workspace_id, sender_email);

COMMENT ON TABLE capture_training_feedback IS
  'User feedback on email classification for learning improvement';

-- Create triage actions table for behavioral learning
CREATE TABLE IF NOT EXISTS capture_triage_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  capture_event_id UUID REFERENCES capture_events(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  time_to_action_ms INTEGER,
  sender_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capture_triage_actions_workspace
  ON capture_triage_actions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_capture_triage_actions_sender
  ON capture_triage_actions(workspace_id, sender_email);

COMMENT ON TABLE capture_triage_actions IS
  'User triage actions (archive, reply, snooze) for behavioral learning';

-- Enable RLS
ALTER TABLE capture_training_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE capture_triage_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies: workspace members can read/write their own data
CREATE POLICY "Workspace members can manage training feedback"
  ON capture_training_feedback
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage triage actions"
  ON capture_triage_actions
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Capture Blocklist Table (Captures V2 Phase 5.3)
-- Workspace-specific blocklists for spam filtering

CREATE TYPE capture_blocklist_type AS ENUM ('domain', 'email', 'sender_pattern');

CREATE TABLE capture_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type capture_blocklist_type NOT NULL,
  value TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  UNIQUE (workspace_id, type, value)
);

-- Index for lookup during ingest
CREATE INDEX idx_capture_blocklist_workspace_type
  ON capture_blocklist(workspace_id, type);

-- Index for domain lookups (most common)
CREATE INDEX idx_capture_blocklist_domain_lookup
  ON capture_blocklist(workspace_id, value)
  WHERE type = 'domain';

-- RLS policies
ALTER TABLE capture_blocklist ENABLE ROW LEVEL SECURITY;

-- Workspace members can view blocklist
CREATE POLICY "Workspace members can view blocklist" ON capture_blocklist
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Workspace admins can manage blocklist
CREATE POLICY "Workspace admins can manage blocklist" ON capture_blocklist
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE capture_blocklist IS 'Workspace-specific blocklists for capture spam filtering';
COMMENT ON COLUMN capture_blocklist.type IS 'Type of blocklist entry: domain, email, or sender_pattern (regex)';
COMMENT ON COLUMN capture_blocklist.value IS 'The blocked value (domain, email, or regex pattern)';
COMMENT ON COLUMN capture_blocklist.reason IS 'Optional reason for blocking (shown in UI)';

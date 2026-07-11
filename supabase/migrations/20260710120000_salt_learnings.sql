-- Salt Learnings Digest (Confidence-Gated Execution Phase 4)
--
-- Records what Salt auto-executed for transparent visibility.
-- Users see "This week Salt updated 12 records" and can undo.

CREATE TABLE salt_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- What was learned
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_label TEXT NOT NULL,  -- Display name for the entity

  -- The change
  field_path TEXT NOT NULL,
  field_label TEXT,            -- Human-readable field name
  old_value JSONB,
  new_value JSONB NOT NULL,

  -- Confidence and evidence
  confidence SMALLINT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  evidence_summary TEXT NOT NULL,  -- "Seen in 3 emails across 2 conversations"
  evidence_ids UUID[],             -- References to entity_evidence rows

  -- Source
  playbook_slug TEXT,
  play_run_id UUID,                -- If executed via a play

  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at TIMESTAMPTZ,             -- When user viewed in digest

  -- Undo tracking
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES auth.users(id),
  undo_reason TEXT,

  -- Constraints
  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'person', 'organization', 'work', 'meeting', 'file', 'me', 'billing'
  ))
);

-- Digest query: unseen learnings for a workspace
CREATE INDEX idx_salt_learnings_unseen
  ON salt_learnings(workspace_id, created_at DESC)
  WHERE seen_at IS NULL AND undone_at IS NULL;

-- Weekly digest grouping
CREATE INDEX idx_salt_learnings_weekly
  ON salt_learnings(workspace_id, created_at DESC)
  WHERE undone_at IS NULL;

-- Entity lookup (for showing learnings on entity detail pages)
CREATE INDEX idx_salt_learnings_entity
  ON salt_learnings(workspace_id, entity_type, entity_id);

-- RLS
ALTER TABLE salt_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace learnings"
  ON salt_learnings FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update learnings in their workspace"
  ON salt_learnings FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access"
  ON salt_learnings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE salt_learnings IS
'Records auto-executed keeper mutations for transparency. Users see digest and can undo.';

COMMENT ON COLUMN salt_learnings.evidence_summary IS
'Human-readable summary like "Seen in 3 emails across 2 conversations"';

COMMENT ON COLUMN salt_learnings.seen_at IS
'Timestamp when user viewed this in the digest. Used for unseen count badge.';

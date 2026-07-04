-- Entity source history: tracks when sources are added or changed
-- Enables showing "Sourced from X on Y" in the source section and activity timeline

CREATE TABLE IF NOT EXISTS entity_source_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Polymorphic entity reference
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'org', 'work', 'billing', 'meeting', 'file')),
  entity_id UUID NOT NULL,

  -- Source details at time of event
  provider entity_provider NOT NULL DEFAULT 'manual',
  source_origin entity_source_origin NOT NULL DEFAULT 'created',
  app_url TEXT,
  source_external_id TEXT,
  capture_event_id UUID REFERENCES capture_events(id) ON DELETE SET NULL,

  -- What triggered this source entry
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'synced', 'extracted', 'reclassified', 'linked')),

  -- When this source was recorded
  sourced_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Actor who triggered the change (null = system/automation)
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Optional context (e.g., "from email thread", "via HubSpot sync")
  context TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_entity_source_history_lookup
  ON entity_source_history(workspace_id, entity_type, entity_id, sourced_at DESC);

CREATE INDEX idx_entity_source_history_provider
  ON entity_source_history(workspace_id, provider);

-- RLS policies
ALTER TABLE entity_source_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view source history in their workspace"
  ON entity_source_history FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert source history in their workspace"
  ON entity_source_history FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Comment
COMMENT ON TABLE entity_source_history IS 'Tracks source provenance history for memory entities - when and where data came from';

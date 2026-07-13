-- Entity Watches: "When X happens, start watching for Y"
-- Part of the LEARN → ACT → GROW reactive signal system.
--
-- Watches are registered when entities are created/updated and checked
-- when new captures arrive. When a capture matches a watch's filter,
-- a derived signal is emitted for the watched entity.

CREATE TABLE entity_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- What entity we're watching FOR (the entity that will receive the derived signal)
  watched_entity_type text NOT NULL,
  watched_entity_id uuid NOT NULL,

  -- What signals/events to watch for on incoming captures
  watch_for_signals text[] NOT NULL,
  filter_criteria jsonb NOT NULL DEFAULT '{}',

  -- What signal to emit when a match is found
  on_match_signal text NOT NULL,
  on_match_extra_evidence jsonb,

  -- Lifecycle
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  triggered_at timestamptz,
  trigger_count int NOT NULL DEFAULT 0,

  -- Prevent duplicate watches for the same entity+signal combination
  CONSTRAINT uq_watch_entity_signal UNIQUE (
    workspace_id,
    watched_entity_type,
    watched_entity_id,
    on_match_signal
  )
);

-- Index for finding active watches by workspace (most common query)
CREATE INDEX idx_entity_watches_workspace_active
  ON entity_watches (workspace_id, expires_at)
  WHERE triggered_at IS NULL OR trigger_count < 10;

-- Index for cleanup cron (finding expired watches)
CREATE INDEX idx_entity_watches_expires
  ON entity_watches (expires_at)
  WHERE expires_at IS NOT NULL;

-- RLS: workspace-scoped access
ALTER TABLE entity_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view watches in their workspace"
  ON entity_watches FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create watches in their workspace"
  ON entity_watches FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update watches in their workspace"
  ON entity_watches FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete watches in their workspace"
  ON entity_watches FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Service role bypass for crons and playbooks
CREATE POLICY "Service role has full access to entity_watches"
  ON entity_watches FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE entity_watches IS
  'Watches for entity-related events. When a capture matches filter_criteria, on_match_signal is emitted for watched_entity_id.';

-- Function to atomically increment trigger count
CREATE OR REPLACE FUNCTION increment_watch_trigger_count(watch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE entity_watches
  SET
    trigger_count = trigger_count + 1,
    triggered_at = COALESCE(triggered_at, now())
  WHERE id = watch_id;
END;
$$;

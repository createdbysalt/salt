-- Note mentions table for tracking @mention backlinks
-- When a note @mentions an entity, we track it here so the mentioned entity's
-- Notes tab can show "Mentioned in a note on [Parent Entity]"

CREATE TABLE IF NOT EXISTS note_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  -- The entity that was @mentioned in the note
  mentioned_entity_type TEXT NOT NULL CHECK (mentioned_entity_type IN ('person', 'organization', 'work', 'billing', 'meeting')),
  mentioned_entity_id UUID NOT NULL,
  -- Denormalized for query efficiency: the note's parent entity
  source_entity_type TEXT NOT NULL CHECK (source_entity_type IN ('person', 'organization', 'work', 'billing', 'meeting')),
  source_entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate mentions of the same entity in the same note
  UNIQUE (note_id, mentioned_entity_type, mentioned_entity_id)
);

-- Index for querying "notes that mention this entity"
CREATE INDEX idx_note_mentions_mentioned ON note_mentions (workspace_id, mentioned_entity_type, mentioned_entity_id);

-- Index for cleanup when a note is updated (re-sync mentions)
CREATE INDEX idx_note_mentions_note_id ON note_mentions (note_id);

-- RLS
ALTER TABLE note_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mentions in their workspace"
  ON note_mentions
  FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert mentions in their workspace"
  ON note_mentions
  FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete mentions in their workspace"
  ON note_mentions
  FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Function to get backlinked notes for an entity
CREATE OR REPLACE FUNCTION get_backlinked_notes(
  p_workspace_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  note_id UUID,
  note_content TEXT,
  note_created_at TIMESTAMPTZ,
  note_author_type TEXT,
  note_is_pinned BOOLEAN,
  note_tags TEXT[],
  source_entity_type TEXT,
  source_entity_id UUID,
  source_entity_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id AS note_id,
    n.content AS note_content,
    n.created_at AS note_created_at,
    n.author_type AS note_author_type,
    n.is_pinned AS note_is_pinned,
    n.tags AS note_tags,
    nm.source_entity_type,
    nm.source_entity_id,
    CASE nm.source_entity_type
      WHEN 'person' THEN (SELECT display_name FROM people WHERE id = nm.source_entity_id)
      WHEN 'organization' THEN (SELECT name FROM organizations WHERE id = nm.source_entity_id)
      WHEN 'work' THEN (SELECT title FROM work WHERE id = nm.source_entity_id)
      WHEN 'billing' THEN (SELECT description FROM billing_records WHERE id = nm.source_entity_id)
      WHEN 'meeting' THEN (SELECT title FROM meetings WHERE id = nm.source_entity_id)
      ELSE 'Unknown'
    END AS source_entity_name
  FROM note_mentions nm
  JOIN notes n ON n.id = nm.note_id
  WHERE nm.workspace_id = p_workspace_id
    AND nm.mentioned_entity_type = p_entity_type
    AND nm.mentioned_entity_id = p_entity_id
    AND n.status != 'dismissed'
    AND n.deleted_at IS NULL
  ORDER BY n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

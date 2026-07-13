-- Captures V2 Phase 3: Watch Expressions for Continuous Awareness
-- When a Person/Org is created, register their identifiers for future matching.
-- Future ingests check against this table to fast-track known entities.

CREATE TYPE watch_expression_type AS ENUM (
  'email',
  'domain',
  'phone',
  'name_pattern'
);

CREATE TABLE entity_watch_expressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- What to match
  expression_type watch_expression_type NOT NULL,
  expression_value TEXT NOT NULL,

  -- What to route to
  target_surface TEXT NOT NULL CHECK (target_surface IN ('people', 'organizations')),
  target_entity_id UUID NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_matched_at TIMESTAMPTZ,

  -- Enforce uniqueness: one expression value per workspace
  UNIQUE (workspace_id, expression_type, expression_value)
);

-- Index for fast matching during ingest
CREATE INDEX idx_watch_expressions_lookup
  ON entity_watch_expressions (workspace_id, expression_type, expression_value);

-- Index for finding all watches for an entity
CREATE INDEX idx_watch_expressions_entity
  ON entity_watch_expressions (target_surface, target_entity_id);

-- RLS: workspace members can read/write their workspace's watches
ALTER TABLE entity_watch_expressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage watch expressions"
  ON entity_watch_expressions
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE entity_watch_expressions IS 'Watch expressions for continuous entity awareness. Registered when People/Orgs are created; checked during capture ingest.';
COMMENT ON COLUMN entity_watch_expressions.expression_type IS 'Type of identifier: email, domain, phone, or name_pattern';
COMMENT ON COLUMN entity_watch_expressions.expression_value IS 'The actual value to match (lowercased for email/domain)';
COMMENT ON COLUMN entity_watch_expressions.last_matched_at IS 'When this expression last matched an ingest; used for re-enrichment throttling';

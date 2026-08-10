-- Memory Customize entries (Customize surfaces, Phase M1)
--
-- Entry-based storage for Memory → Customize: each customization a user
-- (or Salt) writes to steer what Salt looks for is ONE ROW, not a blob —
-- the rendered doc is a view composed from rows, so per-line attribution
-- and revert come free.
--
-- entity_type uses the canonical app vocabulary (person, org, work,
-- meeting, resource) — a new table carries no legacy dialect. v1 surfaces
-- People, Orgs, Work, Resources, Meetings; billing and me are deferred
-- (never-touch field tiers would collide with user steering).
--
-- source: who wrote the line. 'reflection' is reserved for Phase M6
-- (founder-gated) — the CHECK admits it so M6 needs no migration.
-- status: 'active' lines steer the pipeline; 'reverted' lines are kept for
-- audit and never read by decision paths.

CREATE TABLE memory_customize_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('person', 'org', 'work', 'meeting', 'resource')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  source TEXT NOT NULL
    CHECK (source IN ('user', 'ask_salt', 'correction', 'reflection')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'reverted')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The pipeline read: active entries for one workspace + record type.
CREATE INDEX idx_memory_customize_entries_active
  ON memory_customize_entries(workspace_id, entity_type)
  WHERE status = 'active';

ALTER TABLE memory_customize_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view customize entries"
  ON memory_customize_entries
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage customize entries"
  ON memory_customize_entries
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Explicit GRANTs — RLS alone is not enough on environments without
-- default-privilege coverage (the 42501 class; see connector_rules).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_customize_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_customize_entries TO authenticated;

COMMENT ON TABLE memory_customize_entries IS 'Per-record-type customization entries steering Memory intake/care (Memory → Customize, Phase M1)';
COMMENT ON COLUMN memory_customize_entries.entity_type IS 'Canonical app vocabulary: person, org, work, meeting, resource';
COMMENT ON COLUMN memory_customize_entries.source IS 'user = typed on the surface; ask_salt = drafted in chat; correction = from a That''s-wrong flow; reflection = Salt-authored (Phase M6, founder-gated)';
COMMENT ON COLUMN memory_customize_entries.status IS 'active entries steer the pipeline; reverted entries are audit-only';

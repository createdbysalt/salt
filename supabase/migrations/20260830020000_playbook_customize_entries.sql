-- Playbook Customize entries (Playbook page → Customize tab)
--
-- Mirrors memory_customize_entries, but scoped to a playbook instead of a
-- memory record type: each line of guidance the user writes about how Salt
-- should run a play is ONE ROW, so per-line attribution and revert come
-- free. memory_customize_entries' CHECK only admits memory record types, so
-- playbook guidance gets its own table rather than widening that constraint.
--
-- source: who wrote the line ('reflection' reserved for future Salt-authored
-- entries). status: 'active' lines are injected into the playbook's draft /
-- agent prompts; 'reverted' lines are audit-only.

CREATE TABLE playbook_customize_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  playbook_slug TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  source TEXT NOT NULL
    CHECK (source IN ('user', 'ask_salt', 'correction', 'reflection')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'reverted')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The prompt-injection read: active entries for one workspace + playbook.
CREATE INDEX idx_playbook_customize_entries_active
  ON playbook_customize_entries(workspace_id, playbook_slug)
  WHERE status = 'active';

ALTER TABLE playbook_customize_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view playbook customize entries"
  ON playbook_customize_entries
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage playbook customize entries"
  ON playbook_customize_entries
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Explicit GRANTs — RLS alone is not enough on environments without
-- default-privilege coverage (the 42501 class; see connector_rules).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbook_customize_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbook_customize_entries TO authenticated;

COMMENT ON TABLE playbook_customize_entries IS 'Per-playbook guidance entries steering playbook execution (Playbook page → Customize tab)';
COMMENT ON COLUMN playbook_customize_entries.playbook_slug IS 'Playbook definition slug (repo or workspace-forked)';
COMMENT ON COLUMN playbook_customize_entries.source IS 'user = typed on the surface; ask_salt = drafted in chat; correction = from a That''s-wrong flow; reflection = Salt-authored (reserved)';
COMMENT ON COLUMN playbook_customize_entries.status IS 'active entries steer prompts; reverted entries are audit-only';

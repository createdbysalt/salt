-- Connector Rules primitive (Connector Rules & Learning, Phase 2)
--
-- One rules table for intake admission: allow/deny rules keyed by
-- (workspace, provider, entity). provider NULL = workspace-wide rule.
-- entity_type is category-defined vocabulary (sender_email/domain/
-- sender_pattern, channel/author, organizer, customer, owner, contact,
-- host, assignee/project) — see the category coverage matrix in
-- .cursor/plans/2026-08-10-connector-rules-and-learning.md.
--
-- capture_blocklist rows backfill in as (deny, provider NULL) rules;
-- blocklist-manager becomes a facade over the rules manager. The legacy
-- table is kept (deprecated) for rollback — new writes go here only.

CREATE TABLE connector_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT,                    -- NULL = workspace-wide
  rule_type TEXT NOT NULL CHECK (rule_type IN ('allow', 'deny')),
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  reason TEXT,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'suggested')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- NULLS NOT DISTINCT so provider NULL participates in uniqueness
  -- (one workspace-wide rule per entity, not many).
  UNIQUE NULLS NOT DISTINCT (workspace_id, provider, rule_type, entity_type, entity_key)
);

-- Gate-time lookups: workspace + rule type, then provider-scoped narrowing.
CREATE INDEX idx_connector_rules_workspace_type
  ON connector_rules(workspace_id, rule_type);

CREATE INDEX idx_connector_rules_workspace_provider
  ON connector_rules(workspace_id, provider);

-- RLS
ALTER TABLE connector_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view connector rules" ON connector_rules
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage connector rules" ON connector_rules
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Explicit GRANTs — the 42501 class (missing GRANTs bit capture_blocklist
-- 2026-08-06 and capture settings 2026-08-08): RLS alone is not enough on
-- environments without default-privilege coverage.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_rules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_rules TO authenticated;

-- Backfill the legacy email blocklist as workspace-wide deny rules.
INSERT INTO connector_rules (
  workspace_id, provider, rule_type, entity_type, entity_key,
  reason, source, created_by, created_at
)
SELECT
  workspace_id,
  NULL,
  'deny',
  CASE type
    WHEN 'domain' THEN 'domain'
    WHEN 'email' THEN 'sender_email'
    WHEN 'sender_pattern' THEN 'sender_pattern'
  END,
  value,
  reason,
  'user',
  created_by,
  created_at
FROM capture_blocklist
ON CONFLICT DO NOTHING;

COMMENT ON TABLE connector_rules IS 'Allow/deny intake rules per connection or workspace-wide (Connector Rules & Learning P2)';
COMMENT ON COLUMN connector_rules.provider IS 'Composio provider key; NULL = workspace-wide rule';
COMMENT ON COLUMN connector_rules.entity_type IS 'Category-defined entity vocabulary (sender_email, channel, organizer, customer, …)';
COMMENT ON COLUMN connector_rules.source IS 'user = explicit user action; suggested = Salt-suggested (future earned-autonomy loop)';

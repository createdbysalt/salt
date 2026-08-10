-- Learned entity profiles (Connector Rules & Learning, Phase 6)
--
-- Generalizes email's proven capture_sender_profiles learning loop to every
-- capture category: reputation accrues per (workspace, provider, category,
-- entity) from user corrections and admission outcomes, and the admission
-- gate reads it back as a category-general "esteemed entity" signal.
--
-- Email deliberately keeps its own table: capture_sender_profiles carries
-- reply-rate/response-time columns no other category has, and its writers
-- (training-feedback, outbound-reply loop) are proven. entity-profiles.ts
-- dispatches: email sender entities read/write capture_sender_profiles,
-- everything else lands here.
--
-- Storage rule: workspace-learned state never lands in connector_overrides
-- (global Salt catalog) — this table is workspace-keyed.

CREATE TABLE connector_entity_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT,                    -- NULL = entity learned across providers
  category TEXT NOT NULL,           -- ConnectorCategory (email, calendar, …)
  entity_type TEXT NOT NULL,        -- category-defined vocabulary (P2)
  entity_key TEXT NOT NULL,         -- normalized per rules-manager semantics
  reputation_score INT NOT NULL DEFAULT 50 CHECK (reputation_score BETWEEN 0 AND 100),
  observation_count INT NOT NULL DEFAULT 0,
  last_observation_at TIMESTAMPTZ,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- NULLS NOT DISTINCT so provider NULL participates in uniqueness
  -- (same pattern as connector_rules).
  UNIQUE NULLS NOT DISTINCT (workspace_id, provider, category, entity_type, entity_key)
);

-- Gate-time lookup: workspace + entity identity.
CREATE INDEX idx_connector_entity_profiles_lookup
  ON connector_entity_profiles(workspace_id, entity_type, entity_key);

-- RLS
ALTER TABLE connector_entity_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view entity profiles" ON connector_entity_profiles
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage entity profiles" ON connector_entity_profiles
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Explicit GRANTs — the 42501 class (missing GRANTs bit capture_blocklist
-- 2026-08-06, capture settings 2026-08-08, and action_approvals 2026-08-08).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_entity_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_entity_profiles TO authenticated;

COMMENT ON TABLE connector_entity_profiles IS 'Learned per-entity reputation for non-email capture categories (Connector Rules & Learning P6); email stays on capture_sender_profiles';
COMMENT ON COLUMN connector_entity_profiles.provider IS 'Composio provider key; NULL = learned workspace-wide';
COMMENT ON COLUMN connector_entity_profiles.entity_type IS 'Category-defined entity vocabulary from the P2 adapter extraction (channel, organizer, customer, owner, contact, host, assignee, project)';
COMMENT ON COLUMN connector_entity_profiles.reputation_score IS '0-100 learned reputation; corrections ±10, admission outcomes ±5';

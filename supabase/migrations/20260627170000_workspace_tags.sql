-- ============================================================================
-- Workspace Tags + Entity Tag Assignments
-- ============================================================================
-- Phase 2 of Unified Taxonomy & Tags system.
-- Creates the dynamic tags layer with workspace-scoped tags and entity assignments.

-- ============================================================================
-- WORKSPACE TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('person', 'org', 'work', 'all')),
  category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('segment', 'signal', 'priority', 'custom')),
  color TEXT,
  ai_description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT workspace_tags_unique_slug UNIQUE (workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS workspace_tags_workspace_idx ON workspace_tags(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_tags_scope_idx ON workspace_tags(workspace_id, scope) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS workspace_tags_category_idx ON workspace_tags(workspace_id, category) WHERE NOT is_archived;

COMMENT ON TABLE workspace_tags IS 'Workspace-scoped tags for categorizing entities';
COMMENT ON COLUMN workspace_tags.slug IS 'Stable slug for AI reasoning (kebab-case, singularized)';
COMMENT ON COLUMN workspace_tags.label IS 'Human-readable label (renameable without breaking AI)';
COMMENT ON COLUMN workspace_tags.scope IS 'Which entity types this tag applies to';
COMMENT ON COLUMN workspace_tags.category IS 'Tag category for grouping in UI';
COMMENT ON COLUMN workspace_tags.ai_description IS 'Description for AI to understand tag meaning';
COMMENT ON COLUMN workspace_tags.is_system IS 'System tags cannot be deleted or renamed by users';

-- ============================================================================
-- ENTITY TAG ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'org', 'work')),
  entity_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES workspace_tags(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'keeper', 'system')),
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  because TEXT,
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT entity_tag_assignments_unique UNIQUE (entity_type, entity_id, tag_id)
);

CREATE INDEX IF NOT EXISTS entity_tag_assignments_workspace_idx ON entity_tag_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS entity_tag_assignments_entity_idx ON entity_tag_assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS entity_tag_assignments_tag_idx ON entity_tag_assignments(tag_id);

COMMENT ON TABLE entity_tag_assignments IS 'Links entities to tags with provenance';
COMMENT ON COLUMN entity_tag_assignments.source IS 'Who assigned the tag: manual (user), keeper (AI), system';
COMMENT ON COLUMN entity_tag_assignments.confidence IS 'AI confidence for keeper-assigned tags (0-1)';
COMMENT ON COLUMN entity_tag_assignments.because IS 'Explanation of why the tag was assigned';
COMMENT ON COLUMN entity_tag_assignments.source_ref IS 'Reference to source (e.g., play_run_id for keeper)';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE workspace_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Workspace tags: workspace members can read/write
CREATE POLICY "workspace_tags_read" ON workspace_tags
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_tags_write" ON workspace_tags
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Entity tag assignments: workspace members can read/write
CREATE POLICY "entity_tag_assignments_read" ON entity_tag_assignments
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "entity_tag_assignments_write" ON entity_tag_assignments
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- SEED DEFAULT SYSTEM TAGS
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_default_workspace_tags(p_workspace_id UUID)
RETURNS void AS $$
BEGIN
  -- Segment tags (all scopes)
  INSERT INTO workspace_tags (workspace_id, slug, label, scope, category, ai_description, is_system, sort_order)
  VALUES
    (p_workspace_id, 'vip', 'VIP', 'all', 'segment', 'High-value or high-priority entity', true, 0),
    (p_workspace_id, 'startup', 'Startup', 'all', 'segment', 'Early-stage startup company or founder', true, 1),
    (p_workspace_id, 'enterprise', 'Enterprise', 'all', 'segment', 'Large enterprise company', true, 2),
    (p_workspace_id, 'agency', 'Agency', 'all', 'segment', 'Marketing, design, or creative agency', true, 3),
    (p_workspace_id, 'solopreneur', 'Solopreneur', 'all', 'segment', 'Independent professional or solopreneur', true, 4),
    (p_workspace_id, 'referral-source', 'Referral Source', 'all', 'segment', 'Source of referrals to your business', true, 5)
  ON CONFLICT (workspace_id, slug) DO NOTHING;

  -- Signal tags (all scopes)
  INSERT INTO workspace_tags (workspace_id, slug, label, scope, category, ai_description, is_system, sort_order)
  VALUES
    (p_workspace_id, 'at-risk', 'At Risk', 'all', 'signal', 'Relationship health concerns', true, 0),
    (p_workspace_id, 'growth-opportunity', 'Growth Opportunity', 'all', 'signal', 'Potential for expansion or upsell', true, 1),
    (p_workspace_id, 'needs-attention', 'Needs Attention', 'all', 'signal', 'Requires follow-up or action', true, 2),
    (p_workspace_id, 'quick-responder', 'Quick Responder', 'all', 'signal', 'Typically responds quickly to messages', true, 3)
  ON CONFLICT (workspace_id, slug) DO NOTHING;

  -- Priority tags (all scopes)
  INSERT INTO workspace_tags (workspace_id, slug, label, scope, category, ai_description, is_system, sort_order)
  VALUES
    (p_workspace_id, 'high-priority', 'High Priority', 'all', 'priority', 'Should be prioritized in queues and attention', true, 0),
    (p_workspace_id, 'low-touch', 'Low Touch', 'all', 'priority', 'Minimal ongoing attention needed', true, 1)
  ON CONFLICT (workspace_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION seed_default_workspace_tags IS 'Seeds default system tags for a new workspace';

-- Grant execute to service role for onboarding
GRANT EXECUTE ON FUNCTION seed_default_workspace_tags TO service_role;

-- ============================================================================
-- PROFILE PLAYBOOK SETTINGS: Tag threshold
-- ============================================================================

ALTER TABLE profile_playbook_settings
  ADD COLUMN IF NOT EXISTS tag_auto_create_threshold REAL DEFAULT 0.8 CHECK (tag_auto_create_threshold >= 0 AND tag_auto_create_threshold <= 1),
  ADD COLUMN IF NOT EXISTS tag_max_ai_created INTEGER DEFAULT 40;

COMMENT ON COLUMN profile_playbook_settings.tag_auto_create_threshold IS 'Confidence threshold for auto-creating new tags (0-1)';
COMMENT ON COLUMN profile_playbook_settings.tag_max_ai_created IS 'Maximum AI-created tags per scope before proposing instead';

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_workspace_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_tags_updated_at
  BEFORE UPDATE ON workspace_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_tags_updated_at();

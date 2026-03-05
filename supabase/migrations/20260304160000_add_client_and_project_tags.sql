-- ============================================================================
-- CLIENT & PROJECT TAGS
-- These accumulate into Portfolio tags
-- ============================================================================

-- ===================
-- CLIENT TAGS
-- ===================
CREATE TABLE studio_client_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(studio_id, name)
);

-- Indexes
CREATE INDEX studio_client_tags_studio_id_idx ON studio_client_tags(studio_id);

-- RLS
ALTER TABLE studio_client_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_members_view_client_tags" ON studio_client_tags
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid())
);

CREATE POLICY "studio_members_manage_client_tags" ON studio_client_tags
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- ===================
-- PROJECT TAGS
-- ===================
CREATE TABLE studio_project_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(studio_id, name)
);

-- Indexes
CREATE INDEX studio_project_tags_studio_id_idx ON studio_project_tags(studio_id);

-- RLS
ALTER TABLE studio_project_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_members_view_project_tags" ON studio_project_tags
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid())
);

CREATE POLICY "studio_members_manage_project_tags" ON studio_project_tags
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- ===================
-- SEED FUNCTION
-- ===================
CREATE OR REPLACE FUNCTION seed_client_and_project_tags(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  -- Client tags (WHO the client is)
  INSERT INTO studio_client_tags (studio_id, name)
  VALUES
    (p_studio_id, 'Startup'),
    (p_studio_id, 'Enterprise'),
    (p_studio_id, 'Agency'),
    (p_studio_id, 'SaaS'),
    (p_studio_id, 'Nonprofit')
  ON CONFLICT (studio_id, name) DO NOTHING;

  -- Project tags (WHAT the work is)
  INSERT INTO studio_project_tags (studio_id, name)
  VALUES
    (p_studio_id, 'Website'),
    (p_studio_id, 'Branding'),
    (p_studio_id, 'App'),
    (p_studio_id, 'Marketing'),
    (p_studio_id, 'E-commerce')
  ON CONFLICT (studio_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- UPDATE PORTFOLIO TAGS
-- ===================
-- Portfolio items can now reference BOTH client tags and project tags
-- We'll create junction tables for this relationship

CREATE TABLE studio_portfolio_client_tags (
  portfolio_item_id uuid REFERENCES studio_portfolio_items(id) ON DELETE CASCADE,
  client_tag_id uuid REFERENCES studio_client_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (portfolio_item_id, client_tag_id)
);

CREATE TABLE studio_portfolio_project_tags (
  portfolio_item_id uuid REFERENCES studio_portfolio_items(id) ON DELETE CASCADE,
  project_tag_id uuid REFERENCES studio_project_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (portfolio_item_id, project_tag_id)
);

-- Indexes
CREATE INDEX studio_portfolio_client_tags_item_idx ON studio_portfolio_client_tags(portfolio_item_id);
CREATE INDEX studio_portfolio_client_tags_tag_idx ON studio_portfolio_client_tags(client_tag_id);
CREATE INDEX studio_portfolio_project_tags_item_idx ON studio_portfolio_project_tags(portfolio_item_id);
CREATE INDEX studio_portfolio_project_tags_tag_idx ON studio_portfolio_project_tags(project_tag_id);

-- RLS for junction tables
ALTER TABLE studio_portfolio_client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_portfolio_project_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_portfolio_client_tags" ON studio_portfolio_client_tags
FOR SELECT USING (
  portfolio_item_id IN (
    SELECT id FROM studio_portfolio_items
    WHERE studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "manage_portfolio_client_tags" ON studio_portfolio_client_tags
FOR ALL USING (
  portfolio_item_id IN (
    SELECT id FROM studio_portfolio_items
    WHERE studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  )
);

CREATE POLICY "view_portfolio_project_tags" ON studio_portfolio_project_tags
FOR SELECT USING (
  portfolio_item_id IN (
    SELECT id FROM studio_portfolio_items
    WHERE studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "manage_portfolio_project_tags" ON studio_portfolio_project_tags
FOR ALL USING (
  portfolio_item_id IN (
    SELECT id FROM studio_portfolio_items
    WHERE studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  )
);

-- ===================
-- AUTO-SEED ON STUDIO CREATION
-- ===================
-- Add to the existing studio creation trigger or call manually
-- For existing studios, we'll seed them now:
DO $$
DECLARE
  studio_record RECORD;
BEGIN
  FOR studio_record IN SELECT id FROM studios LOOP
    PERFORM seed_client_and_project_tags(studio_record.id);
  END LOOP;
END $$;

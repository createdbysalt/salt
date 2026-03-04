-- ============================================================================
-- PORTFOLIO ITEMS & TAGS
-- ============================================================================

-- Portfolio tags (separate from studio_tags for cleaner separation)
CREATE TABLE studio_portfolio_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid REFERENCES studios(id) ON DELETE CASCADE,  -- NULL for system defaults
  name text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,

  -- Prevent duplicate tag names per studio (or globally for defaults)
  UNIQUE NULLS NOT DISTINCT (studio_id, name)
);

-- Default portfolio tags (studio_id = NULL means system-wide defaults)
INSERT INTO studio_portfolio_tags (studio_id, name, is_default) VALUES
  (NULL, 'Website', true),
  (NULL, 'Branding', true),
  (NULL, 'E-commerce', true),
  (NULL, 'Retainer', true),
  (NULL, 'One-time', true),
  (NULL, 'Nonprofit', true),
  (NULL, 'SaaS', true),
  (NULL, 'Local Business', true),
  (NULL, 'Church', true),
  (NULL, 'Restaurant', true),
  (NULL, 'Healthcare', true),
  (NULL, 'Real Estate', true);

-- Portfolio items
CREATE TABLE studio_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

  -- Core fields
  title text NOT NULL,
  subtitle text,                    -- e.g., "Oshawa, Ontario"
  description text,
  link_url text,
  link_text text,                   -- e.g., "Visit vivachurch.ca"

  -- Media
  hero_image_url text,

  -- Stats (array of {value, label} pairs)
  stats jsonb DEFAULT '[]'::jsonb,

  -- Display settings
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 999,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Junction table for portfolio items <-> tags
CREATE TABLE studio_portfolio_item_tags (
  portfolio_item_id uuid REFERENCES studio_portfolio_items(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES studio_portfolio_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (portfolio_item_id, tag_id)
);

-- Indexes
CREATE INDEX studio_portfolio_items_studio_id_idx ON studio_portfolio_items(studio_id);
CREATE INDEX studio_portfolio_items_featured_idx ON studio_portfolio_items(studio_id, is_featured) WHERE is_featured = true;
CREATE INDEX studio_portfolio_items_sort_idx ON studio_portfolio_items(studio_id, sort_order);
CREATE INDEX studio_portfolio_tags_studio_id_idx ON studio_portfolio_tags(studio_id);
CREATE INDEX studio_portfolio_item_tags_item_idx ON studio_portfolio_item_tags(portfolio_item_id);
CREATE INDEX studio_portfolio_item_tags_tag_idx ON studio_portfolio_item_tags(tag_id);

-- RLS
ALTER TABLE studio_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_portfolio_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_portfolio_item_tags ENABLE ROW LEVEL SECURITY;

-- Portfolio items policies
CREATE POLICY "studio_members_view_portfolio_items"
  ON studio_portfolio_items FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "studio_members_manage_portfolio_items"
  ON studio_portfolio_items FOR ALL
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Portfolio tags policies (allow viewing defaults + own studio tags)
CREATE POLICY "view_portfolio_tags"
  ON studio_portfolio_tags FOR SELECT
  USING (
    studio_id IS NULL  -- System defaults visible to all
    OR studio_id IN (
      SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "studio_members_manage_portfolio_tags"
  ON studio_portfolio_tags FOR ALL
  USING (
    studio_id IS NOT NULL  -- Can't modify system defaults
    AND studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Junction table policies
CREATE POLICY "view_portfolio_item_tags"
  ON studio_portfolio_item_tags FOR SELECT
  USING (
    portfolio_item_id IN (
      SELECT id FROM studio_portfolio_items
      WHERE studio_id IN (
        SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "manage_portfolio_item_tags"
  ON studio_portfolio_item_tags FOR ALL
  USING (
    portfolio_item_id IN (
      SELECT id FROM studio_portfolio_items
      WHERE studio_id IN (
        SELECT studio_id FROM studio_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
      )
    )
  );

-- Updated at trigger
CREATE TRIGGER update_studio_portfolio_items_updated_at
  BEFORE UPDATE ON studio_portfolio_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

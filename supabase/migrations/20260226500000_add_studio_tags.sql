-- ============================================================================
-- Migration: Studio Tags for Services Catalog
-- Purpose: Tag management for features (capabilities) and deliverables (outputs)
-- Pattern: Follows studio_members structure with Linear-style grouping
-- ============================================================================

CREATE TABLE public.studio_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Tag info
  name text NOT NULL,

  -- Grouping (Linear-style)
  tag_type text NOT NULL CHECK (tag_type IN ('feature', 'deliverable')),
  category text NOT NULL,  -- e.g., "Responsive", "Performance", "Pages", "Branding"

  -- Display
  sort_order integer DEFAULT 999,
  is_default boolean DEFAULT false,  -- System-provided default (can be deleted)

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(studio_id, tag_type, name)
);

-- Indexes
CREATE INDEX studio_tags_studio_id_idx ON studio_tags(studio_id);
CREATE INDEX studio_tags_type_idx ON studio_tags(studio_id, tag_type);
CREATE INDEX studio_tags_category_idx ON studio_tags(studio_id, tag_type, category);

-- RLS
ALTER TABLE studio_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_members_view_tags" ON studio_tags
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid())
);

CREATE POLICY "studio_members_manage_tags" ON studio_tags
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_studio_tags_updated_at
  BEFORE UPDATE ON studio_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed function to copy default tags to new studios
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_default_tags(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO studio_tags (studio_id, name, tag_type, category, sort_order, is_default)
  VALUES
    -- FEATURES: Responsive
    (p_studio_id, 'Mobile Ready', 'feature', 'Responsive', 1, true),
    (p_studio_id, 'Tablet Optimized', 'feature', 'Responsive', 2, true),

    -- FEATURES: Performance
    (p_studio_id, 'SEO Optimized', 'feature', 'Performance', 1, true),
    (p_studio_id, 'AEO Ready', 'feature', 'Performance', 2, true),
    (p_studio_id, 'Fast Loading', 'feature', 'Performance', 3, true),

    -- FEATURES: Technical
    (p_studio_id, 'CMS Integration', 'feature', 'Technical', 1, true),
    (p_studio_id, 'E-commerce', 'feature', 'Technical', 2, true),
    (p_studio_id, 'API Integration', 'feature', 'Technical', 3, true),

    -- FEATURES: Design
    (p_studio_id, 'Dark Mode', 'feature', 'Design', 1, true),
    (p_studio_id, 'Animation', 'feature', 'Design', 2, true),
    (p_studio_id, 'Accessibility (WCAG)', 'feature', 'Design', 3, true),

    -- FEATURES: Revisions
    (p_studio_id, '1 Revision', 'feature', 'Revisions', 1, true),
    (p_studio_id, '2 Revisions', 'feature', 'Revisions', 2, true),
    (p_studio_id, '3 Revisions', 'feature', 'Revisions', 3, true),
    (p_studio_id, 'Unlimited Revisions', 'feature', 'Revisions', 4, true),

    -- FEATURES: Support
    (p_studio_id, 'Priority Support', 'feature', 'Support', 1, true),
    (p_studio_id, 'Slack Channel', 'feature', 'Support', 2, true),

    -- DELIVERABLES: Pages
    (p_studio_id, 'Homepage', 'deliverable', 'Pages', 1, true),
    (p_studio_id, 'Inner Pages', 'deliverable', 'Pages', 2, true),
    (p_studio_id, 'Landing Page', 'deliverable', 'Pages', 3, true),
    (p_studio_id, 'Blog Template', 'deliverable', 'Pages', 4, true),

    -- DELIVERABLES: Branding
    (p_studio_id, 'Logo', 'deliverable', 'Branding', 1, true),
    (p_studio_id, 'Logo Variations', 'deliverable', 'Branding', 2, true),
    (p_studio_id, 'Color Palette', 'deliverable', 'Branding', 3, true),
    (p_studio_id, 'Typography', 'deliverable', 'Branding', 4, true),
    (p_studio_id, 'Brand Guidelines', 'deliverable', 'Branding', 5, true),

    -- DELIVERABLES: Documentation
    (p_studio_id, 'Style Guide', 'deliverable', 'Documentation', 1, true),

    -- DELIVERABLES: Files
    (p_studio_id, 'Source Files', 'deliverable', 'Files', 1, true),
    (p_studio_id, 'Figma Files', 'deliverable', 'Files', 2, true),
    (p_studio_id, 'Prototype', 'deliverable', 'Files', 3, true),

    -- DELIVERABLES: Assets
    (p_studio_id, 'Icons', 'deliverable', 'Assets', 1, true),
    (p_studio_id, 'Illustrations', 'deliverable', 'Assets', 2, true),
    (p_studio_id, 'Mockups', 'deliverable', 'Assets', 3, true),
    (p_studio_id, 'Social Templates', 'deliverable', 'Assets', 4, true)
  ON CONFLICT (studio_id, tag_type, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

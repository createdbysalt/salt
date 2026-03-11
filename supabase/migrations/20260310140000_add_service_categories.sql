-- ============================================================================
-- Service Categories (Studio-Scoped)
-- ============================================================================
-- Each studio gets their own categories. Default categories are seeded per-studio
-- when they first access the feature, so studios can customize without affecting others.

-- Create service_categories table
CREATE TABLE service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text, -- Optional hex color for visual grouping
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique name per studio
  CONSTRAINT service_categories_studio_name_unique UNIQUE (studio_id, name)
);

-- Indexes
CREATE INDEX service_categories_studio_id_idx ON service_categories(studio_id);
CREATE INDEX service_categories_sort_order_idx ON service_categories(studio_id, sort_order);

-- Enable RLS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Studio members can view and manage their studio's categories
CREATE POLICY "studio_members_view_service_categories" ON service_categories
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "studio_members_manage_service_categories" ON service_categories
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- Add category_id to studio_services (nullable for migration)
ALTER TABLE studio_services
ADD COLUMN category_id uuid REFERENCES service_categories(id) ON DELETE SET NULL;

-- Index for category lookups
CREATE INDEX studio_services_category_id_idx ON studio_services(category_id);

-- Updated_at trigger for service_categories
CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration: Convert existing free-text categories to category_id
-- ============================================================================
-- This will be handled in application code during the seeding process.
-- When a studio's categories are seeded, we'll also migrate their existing
-- services to use the new category_id based on matching names.

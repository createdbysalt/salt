-- ============================================================================
-- ENTITY LINKS: Simple graph edges connecting entities
-- Migration: Create entity_links table
-- ============================================================================
--
-- Links are simple connections with no data of their own.
-- Multiple links are allowed (a project can link to many people, etc.)
-- Link/unlink is just add/remove — no archive needed.
--
-- The role, relationship details, etc. live on the entity's detail page,
-- not on the link itself.
--
-- ============================================================================

-- ============================================================================
-- ENTITY LINKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Source entity
  source_type TEXT NOT NULL CHECK (source_type IN ('person', 'org', 'work', 'space')),
  source_id UUID NOT NULL,

  -- Target entity
  target_type TEXT NOT NULL CHECK (target_type IN ('person', 'org', 'work', 'space')),
  target_id UUID NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Prevent duplicate links
  UNIQUE(workspace_id, source_type, source_id, target_type, target_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookups by source
CREATE INDEX entity_links_source_idx
  ON entity_links(workspace_id, source_type, source_id);

-- Fast lookups by target (for reverse traversal)
CREATE INDEX entity_links_target_idx
  ON entity_links(workspace_id, target_type, target_id);

-- For finding all links of a specific type (e.g., all person-org links)
CREATE INDEX entity_links_types_idx
  ON entity_links(workspace_id, source_type, target_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE entity_links ENABLE ROW LEVEL SECURITY;

-- Studio members can view links in their workspace
CREATE POLICY "studio_members_view_links" ON entity_links
FOR SELECT USING (
  workspace_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

-- Studio members can manage links in their workspace
CREATE POLICY "studio_members_manage_links" ON entity_links
FOR ALL USING (
  workspace_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.entity_links IS 'Simple graph edges connecting entities. No data on the link itself — just connections. Many-to-many allowed.';
COMMENT ON COLUMN public.entity_links.source_type IS 'Entity type of the source: person, org, work, space';
COMMENT ON COLUMN public.entity_links.target_type IS 'Entity type of the target: person, org, work, space';

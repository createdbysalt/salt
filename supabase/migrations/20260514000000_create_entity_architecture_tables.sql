-- ============================================================================
-- ENTITY ARCHITECTURE: Core Tables
-- Migration: Create organizations, people, teams, and relations tables
-- ============================================================================
--
-- This migration adds new entity tables alongside existing ones (non-breaking).
-- The existing `clients` table is NOT modified - data migration comes later.
--
-- New tables:
--   - organizations: External companies we work with
--   - people: External contacts (individuals)
--   - organization_people: Junction linking people to organizations
--   - teams: Internal groups within a workspace
--   - team_members: Junction linking studio_members to teams
--   - entity_relations: Obsidian-style linking between any entities
--
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATIONS TABLE
-- Purpose: External companies/businesses we interact with
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  slug TEXT,

  -- Relationship status (replaces lifecycle_stage concept)
  relationship_status TEXT DEFAULT 'prospect'
    CHECK (relationship_status IN ('prospect', 'client', 'past_client', 'partner', 'vendor', 'other')),

  -- Contact info (organization-level)
  website TEXT,
  industry TEXT,
  address TEXT,

  -- Rich content
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ, -- Soft delete support

  -- Migration tracking
  migrated_from_client_id UUID, -- References clients(id) after migration

  UNIQUE(studio_id, slug)
);

-- Indexes for organizations
CREATE INDEX IF NOT EXISTS idx_organizations_studio_id ON public.organizations(studio_id);
CREATE INDEX IF NOT EXISTS idx_organizations_relationship_status ON public.organizations(relationship_status);
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON public.organizations(deleted_at) WHERE deleted_at IS NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. PEOPLE TABLE
-- Purpose: External contacts (individuals we interact with)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT, -- Job title

  -- Relationship status
  relationship_status TEXT DEFAULT 'other'
    CHECK (relationship_status IN ('prospect', 'client', 'past_client', 'partner', 'vendor', 'other')),

  -- Rich content
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  avatar_url TEXT,

  -- Portal access (for The Table)
  portal_user_id UUID REFERENCES auth.users(id),

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ, -- Soft delete support

  -- Migration tracking
  migrated_from_client_id UUID, -- References clients(id) after migration
  migrated_from_client_user_id UUID -- References client_users(id) after migration
);

-- Indexes for people
CREATE INDEX IF NOT EXISTS idx_people_studio_id ON public.people(studio_id);
CREATE INDEX IF NOT EXISTS idx_people_relationship_status ON public.people(relationship_status);
CREATE INDEX IF NOT EXISTS idx_people_email ON public.people(email);
CREATE INDEX IF NOT EXISTS idx_people_portal_user_id ON public.people(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_people_deleted_at ON public.people(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. ORGANIZATION_PEOPLE JUNCTION
-- Purpose: Links people to organizations (person works at company)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organization_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,

  -- Role at the organization
  role TEXT, -- 'Primary Contact', 'Billing', 'Technical', 'Executive', etc.
  is_primary BOOLEAN DEFAULT FALSE,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(organization_id, person_id)
);

-- Indexes for organization_people
CREATE INDEX IF NOT EXISTS idx_organization_people_org ON public.organization_people(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_people_person ON public.organization_people(person_id);
CREATE INDEX IF NOT EXISTS idx_organization_people_primary ON public.organization_people(is_primary) WHERE is_primary = TRUE;

-- ============================================================================
-- 4. TEAMS TABLE
-- Purpose: Internal groups within a workspace for collaboration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  description TEXT,
  color TEXT, -- Hex color for UI display
  icon TEXT, -- Icon identifier

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_studio_id ON public.teams(studio_id);

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. TEAM_MEMBERS JUNCTION
-- Purpose: Links studio_members to teams
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  studio_member_id UUID NOT NULL REFERENCES public.studio_members(id) ON DELETE CASCADE,

  -- Role within team (optional)
  role TEXT, -- 'lead', 'member'

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(team_id, studio_member_id)
);

-- Indexes for team_members
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON public.team_members(studio_member_id);

-- ============================================================================
-- 6. ENTITY_RELATIONS TABLE
-- Purpose: Obsidian-style linking between any entities
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entity_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Source entity
  from_entity_type TEXT NOT NULL, -- 'person', 'organization', 'project', 'note', 'message'
  from_entity_id UUID NOT NULL,

  -- Target entity
  to_entity_type TEXT NOT NULL,
  to_entity_id UUID NOT NULL,

  -- Relation metadata
  relation_type TEXT, -- 'works_at', 'contact_for', 'related_to', 'mentioned_in', 'parent_of'
  context TEXT, -- Optional description of the relationship

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Prevent duplicate relations
  UNIQUE(studio_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, relation_type)
);

-- Indexes for entity_relations
CREATE INDEX IF NOT EXISTS idx_entity_relations_studio ON public.entity_relations(studio_id);
CREATE INDEX IF NOT EXISTS idx_entity_relations_from ON public.entity_relations(from_entity_type, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relations_to ON public.entity_relations(to_entity_type, to_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relations_type ON public.entity_relations(relation_type);

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get backlinks (what links TO this entity)
CREATE OR REPLACE FUNCTION public.get_entity_backlinks(
  p_studio_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  from_entity_type TEXT,
  from_entity_id UUID,
  relation_type TEXT,
  context TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    er.id,
    er.from_entity_type,
    er.from_entity_id,
    er.relation_type,
    er.context,
    er.created_at
  FROM public.entity_relations er
  WHERE er.studio_id = p_studio_id
    AND er.to_entity_type = p_entity_type
    AND er.to_entity_id = p_entity_id
  ORDER BY er.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE: Tables created, indexes added
-- Next migration: RLS policies
-- ============================================================================

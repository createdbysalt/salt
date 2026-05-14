-- ============================================================================
-- ENTITY ARCHITECTURE: RLS Policies
-- Migration: Add Row Level Security for new entity tables
-- ============================================================================
--
-- Pattern: Studio members can access their studio's data
-- Uses the established pattern from existing tables (non-recursive)
--
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATIONS RLS
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Studio members can view organizations in their studio
CREATE POLICY "Studio members can view organizations"
  ON public.organizations FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio owners/admins can insert organizations
CREATE POLICY "Studio owners can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin', 'member')
    )
  );

-- Studio owners/admins can update organizations
CREATE POLICY "Studio owners can update organizations"
  ON public.organizations FOR UPDATE
  USING (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin', 'member')
    )
  );

-- Studio owners/admins can delete organizations
CREATE POLICY "Studio owners can delete organizations"
  ON public.organizations FOR DELETE
  USING (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 2. PEOPLE RLS
-- ============================================================================

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- Studio members can view people in their studio
CREATE POLICY "Studio members can view people"
  ON public.people FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Portal users can view their own record
CREATE POLICY "Portal users can view own record"
  ON public.people FOR SELECT
  USING (portal_user_id = auth.uid());

-- Studio members can create people
CREATE POLICY "Studio members can create people"
  ON public.people FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin', 'member')
    )
  );

-- Studio members can update people
CREATE POLICY "Studio members can update people"
  ON public.people FOR UPDATE
  USING (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin', 'member')
    )
  );

-- Studio owners/admins can delete people
CREATE POLICY "Studio owners can delete people"
  ON public.people FOR DELETE
  USING (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 3. ORGANIZATION_PEOPLE RLS
-- ============================================================================

ALTER TABLE public.organization_people ENABLE ROW LEVEL SECURITY;

-- Studio members can view via organization
CREATE POLICY "Studio members can view organization_people"
  ON public.organization_people FOR SELECT
  USING (
    organization_id IN (
      SELECT o.id FROM public.organizations o
      JOIN public.studio_members sm ON sm.studio_id = o.studio_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Studio members can manage organization_people
CREATE POLICY "Studio members can manage organization_people"
  ON public.organization_people FOR ALL
  USING (
    organization_id IN (
      SELECT o.id FROM public.organizations o
      JOIN public.studio_members sm ON sm.studio_id = o.studio_id
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin', 'member')
    )
  );

-- ============================================================================
-- 4. TEAMS RLS
-- ============================================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Studio members can view teams in their studio
CREATE POLICY "Studio members can view teams"
  ON public.teams FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio owners/admins can create teams
CREATE POLICY "Studio admins can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
    )
  );

-- Studio owners/admins can update teams
CREATE POLICY "Studio admins can update teams"
  ON public.teams FOR UPDATE
  USING (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
    )
  );

-- Studio owners/admins can delete teams
CREATE POLICY "Studio admins can delete teams"
  ON public.teams FOR DELETE
  USING (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 5. TEAM_MEMBERS RLS
-- ============================================================================

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Studio members can view team_members in their teams
CREATE POLICY "Studio members can view team_members"
  ON public.team_members FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.studio_members sm ON sm.studio_id = t.studio_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Studio admins can manage team_members
CREATE POLICY "Studio admins can manage team_members"
  ON public.team_members FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.studio_members sm ON sm.studio_id = t.studio_id
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 6. ENTITY_RELATIONS RLS
-- ============================================================================

ALTER TABLE public.entity_relations ENABLE ROW LEVEL SECURITY;

-- Studio members can view relations in their studio
CREATE POLICY "Studio members can view entity_relations"
  ON public.entity_relations FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create relations
CREATE POLICY "Studio members can create entity_relations"
  ON public.entity_relations FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can delete their own relations
CREATE POLICY "Users can delete own entity_relations"
  ON public.entity_relations FOR DELETE
  USING (created_by = auth.uid());

-- Studio admins can delete any relation
CREATE POLICY "Studio admins can delete entity_relations"
  ON public.entity_relations FOR DELETE
  USING (
    studio_id IN (
      SELECT sm.studio_id FROM public.studio_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- DONE: RLS policies added for all new tables
-- ============================================================================

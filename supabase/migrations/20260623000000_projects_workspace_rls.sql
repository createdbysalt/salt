-- ============================================================================
-- Migration: Align projects RLS with workspace membership
-- ============================================================================
--
-- projects policies still referenced public.studio_members (compatibility view).
-- Newer tables use public.is_workspace_member(workspace_id) directly against
-- workspace_members. projects.studio_id stores the workspace tenant id.
-- ============================================================================

DROP POLICY IF EXISTS "Studio members view projects via membership" ON public.projects;
DROP POLICY IF EXISTS "Studio members manage projects via membership" ON public.projects;
DROP POLICY IF EXISTS "Studio members update projects via membership" ON public.projects;
DROP POLICY IF EXISTS "Studio members delete projects via membership" ON public.projects;
DROP POLICY IF EXISTS "Client users view projects via membership" ON public.projects;
DROP POLICY IF EXISTS "Studio members can view studio projects" ON public.projects;
DROP POLICY IF EXISTS "Studio members can manage studio projects" ON public.projects;
DROP POLICY IF EXISTS "Client users can view their associated projects" ON public.projects;
DROP POLICY IF EXISTS "Studio members can view their projects" ON public.projects;
DROP POLICY IF EXISTS "Client users can view their projects" ON public.projects;
DROP POLICY IF EXISTS "Studio members can manage their projects" ON public.projects;
DROP POLICY IF EXISTS "Client users can view their client projects" ON public.projects;

CREATE POLICY "workspace_members_view_projects"
  ON public.projects FOR SELECT
  USING (public.is_workspace_member(studio_id));

CREATE POLICY "workspace_members_insert_projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.is_workspace_member(studio_id));

CREATE POLICY "workspace_members_update_projects"
  ON public.projects FOR UPDATE
  USING (public.is_workspace_member(studio_id))
  WITH CHECK (public.is_workspace_member(studio_id));

CREATE POLICY "workspace_members_delete_projects"
  ON public.projects FOR DELETE
  USING (public.is_workspace_member(studio_id));

CREATE POLICY "client_users_view_projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.client_users cu
      WHERE cu.client_id = projects.client_id
        AND cu.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "workspace_members_view_projects" ON public.projects IS
  'Workspace members can view projects scoped to their workspace (projects.studio_id).';

-- Add project_id to knowledge_items for project-level organization
-- Items without a project_id are "client-level" (visible across all projects)

-- =============================================================================
-- ADD PROJECT_ID COLUMN
-- =============================================================================

ALTER TABLE public.knowledge_items
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for project filtering
CREATE INDEX IF NOT EXISTS knowledge_items_project_idx
ON public.knowledge_items(project_id)
WHERE project_id IS NOT NULL;

-- Composite index for efficient project + client queries
CREATE INDEX IF NOT EXISTS knowledge_items_client_project_idx
ON public.knowledge_items(client_id, project_id);

-- =============================================================================
-- UPDATE RLS POLICIES
-- =============================================================================

-- Drop existing policies to recreate with project awareness
DROP POLICY IF EXISTS "studio_members_view_knowledge" ON public.knowledge_items;
DROP POLICY IF EXISTS "studio_members_manage_knowledge" ON public.knowledge_items;
DROP POLICY IF EXISTS "client_users_view_knowledge" ON public.knowledge_items;

-- Studio members can view their knowledge items
CREATE POLICY "studio_members_view_knowledge" ON public.knowledge_items
FOR SELECT TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
  )
);

-- Studio members can manage their knowledge items
CREATE POLICY "studio_members_manage_knowledge" ON public.knowledge_items
FOR ALL TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
  )
);

-- Client users can view non-private knowledge items for their client
-- They can see items linked to their projects OR client-level items (project_id IS NULL)
CREATE POLICY "client_users_view_knowledge" ON public.knowledge_items
FOR SELECT TO authenticated
USING (
  NOT is_private AND (
    -- Client-level items (no project)
    (client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid()) AND project_id IS NULL)
    OR
    -- Project-specific items (only for projects they have access to)
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.client_users cu ON cu.client_id = p.client_id
      WHERE cu.user_id = auth.uid()
    )
  )
);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN public.knowledge_items.project_id IS 'Optional project association. NULL = client-level (visible in all projects for this client)';

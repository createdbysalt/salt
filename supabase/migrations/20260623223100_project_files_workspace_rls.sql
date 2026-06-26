-- ============================================================================
-- Files: align project_files RLS with workspace membership + reload schema
-- ============================================================================
-- project_files policies still referenced studio_members compatibility paths on
-- some environments. Align with projects table pattern and ensure grants exist.
-- ============================================================================

DROP POLICY IF EXISTS "Studio members can view their project files" ON public.project_files;
DROP POLICY IF EXISTS "Studio members can upload project files" ON public.project_files;
DROP POLICY IF EXISTS "Studio members can update their project files" ON public.project_files;
DROP POLICY IF EXISTS "Studio members can delete their project files" ON public.project_files;

CREATE POLICY "workspace_members_view_project_files"
  ON public.project_files FOR SELECT
  USING (public.is_workspace_member(studio_id));

CREATE POLICY "workspace_members_insert_project_files"
  ON public.project_files FOR INSERT
  WITH CHECK (public.is_workspace_member(studio_id));

CREATE POLICY "workspace_members_update_project_files"
  ON public.project_files FOR UPDATE
  USING (public.is_workspace_member(studio_id))
  WITH CHECK (public.is_workspace_member(studio_id));

CREATE POLICY "workspace_members_delete_project_files"
  ON public.project_files FOR DELETE
  USING (public.is_workspace_member(studio_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tag_assignments TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tags TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tag_assignments TO service_role;

NOTIFY pgrst, 'reload schema';

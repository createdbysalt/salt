-- ============================================================================
-- Files: grants for related tables used by project_files RLS + directory queries
-- ============================================================================
-- Staging was missing SELECT on client_users/clients/projects. project_files
-- RLS policies subquery client_users; without table privileges PostgREST fails
-- with permission denied before rows are returned.
-- ============================================================================

GRANT SELECT ON public.client_users TO authenticated;
GRANT SELECT ON public.clients TO authenticated;
GRANT SELECT ON public.projects TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tag_assignments TO authenticated;

GRANT SELECT ON public.client_users TO service_role;
GRANT SELECT ON public.clients TO service_role;
GRANT SELECT ON public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tags TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tag_assignments TO service_role;

NOTIFY pgrst, 'reload schema';

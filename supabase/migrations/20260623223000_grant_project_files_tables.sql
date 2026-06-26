-- ============================================================================
-- Files: table grants for authenticated and service-role access
-- ============================================================================
-- project_files, file_tags, and file_tag_assignments had RLS policies but no
-- table privileges, so PostgREST rejected reads before policy evaluation.
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tag_assignments TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tags TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tag_assignments TO service_role;

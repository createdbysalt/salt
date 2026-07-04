-- ============================================================================
-- WORKSPACE-SCOPED FILES (me-files-tab plan)
-- ============================================================================
--
-- project_files_has_owner (from 20260226000000) required project_id OR
-- client_id on every file — a Bridge-era assumption. Files are
-- workspace-scoped now (Brand Kit assets, business documents); person/org/
-- work links are optional and live on person_id/organization_id/project_id
-- or entity_links. workspace_id NOT NULL already guarantees tenancy.
-- ============================================================================

ALTER TABLE public.project_files
  DROP CONSTRAINT IF EXISTS project_files_has_owner;

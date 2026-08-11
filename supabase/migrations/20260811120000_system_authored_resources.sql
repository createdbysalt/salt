-- ============================================================================
-- SYSTEM-AUTHORED RESOURCES + RESOURCE TAG ASSIGNMENTS
--
-- Phase 0 of .cursor/plans/2026-08-10-registry-wiring-record-sourcing.md.
--
-- 1. resources.uploaded_by drops NOT NULL. Background paths (system plays,
--    evidence auto-create) have no acting user; today they either skip
--    resource creation entirely (auto-create-record.ts) or write the literal
--    string 'system' into a uuid FK column (system-plays create-file), which
--    can never succeed. System authorship is now explicit:
--    uploaded_by IS NULL + created_by_system = true.
-- 2. entity_tag_assignments accepts entity_type 'resource'. The
--    files→resources rename (20260810150000) added 'resource' to
--    workspace_tags.scope but not to the assignment CHECK, so tagging a
--    Resource from the UI failed the constraint. (resource_tag_assignments
--    stays the resource-tags namespace used by the directory; this CHECK
--    governs the workspace_tags system used by TagEditor.)
-- ============================================================================

BEGIN;

-- 1a. Nullable uploader for system-authored rows
ALTER TABLE public.resources
  ALTER COLUMN uploaded_by DROP NOT NULL;

-- 1b. Explicit system-authorship marker
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS created_by_system boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.resources.uploaded_by IS 'User who uploaded the file (studio member or client user). NULL when created_by_system is true.';
COMMENT ON COLUMN public.resources.created_by_system IS 'True when Salt created this Resource in the background (system play, evidence auto-create) without an acting user.';

-- 2. Allow resource assignments in the workspace_tags system
ALTER TABLE public.entity_tag_assignments
  DROP CONSTRAINT IF EXISTS entity_tag_assignments_entity_type_check;

ALTER TABLE public.entity_tag_assignments
  ADD CONSTRAINT entity_tag_assignments_entity_type_check
  CHECK (entity_type IN ('person', 'org', 'work', 'billing', 'resource'));

COMMENT ON COLUMN public.entity_tag_assignments.entity_type IS 'Tagged entity type: person, org, work, billing, or resource';

COMMIT;

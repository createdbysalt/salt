-- ============================================================================
-- FIX: Update projects table constraints
-- ============================================================================
-- 
-- Issues:
-- 1. Constraint name still references old "projects_new" table name
-- 2. Status constraint missing 'on_hold' value used in the app
-- 3. Unique constraint may have old name
-- ============================================================================

-- Drop old constraints
alter table public.projects drop constraint if exists valid_project_status;
alter table public.projects drop constraint if exists "projects_new_studio_id_slug_key";

-- Recreate unique constraint with proper name
alter table public.projects 
  add constraint projects_studio_id_slug_key unique(studio_id, slug);

-- Add updated status constraint with all values
alter table public.projects 
  add constraint valid_project_status check (
    status in ('draft', 'signed', 'active', 'on_hold', 'completed', 'archived')
  );

-- ============================================================================
-- FIXED: Constraints now match actual usage
-- ============================================================================


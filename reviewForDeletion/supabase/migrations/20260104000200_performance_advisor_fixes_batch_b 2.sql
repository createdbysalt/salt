-- ============================================================================
-- Performance Advisor Fixes - BATCH B (CONCURRENT INDEXES - NO TRANSACTION)
-- ============================================================================
-- Purpose: Add missing FK indexes and remove duplicate indexes
-- Layer: Performance/Infrastructure
-- Safety: MUST run WITHOUT explicit transaction (CONCURRENTLY requires autocommit)
-- Execution: Run each statement separately in SQL Editor
-- ============================================================================

-- IMPORTANT: Do NOT wrap these statements in BEGIN/COMMIT
-- Each CREATE/DROP INDEX CONCURRENTLY must run in autocommit mode

-- ============================================================================
-- B1) ADD MISSING COVERING INDEXES
-- ============================================================================

-- Add covering index for tag_assignments foreign key (tag_id, studio_id)
-- Rationale: Foreign key constraint references tags(id, studio_id) but no covering index exists
-- Impact: Improves JOIN performance and DELETE cascades from tags table
-- Cost: ~minimal (tag_assignments likely small)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tag_assignments_tag_id_studio_id 
  ON public.tag_assignments(tag_id, studio_id);

COMMENT ON INDEX public.idx_tag_assignments_tag_id_studio_id IS 
  'Covers composite FK to tags(id, studio_id) - Performance Layer';

-- Add index for project_milestones self-referential FK
-- Rationale: depends_on_milestone_id lacks covering index for ON DELETE SET NULL cascade
-- Impact: Improves DELETE performance and milestone dependency queries
-- Cost: ~minimal (most milestones won't have dependencies, hence partial index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_milestones_depends_on 
  ON public.project_milestones(depends_on_milestone_id)
  WHERE depends_on_milestone_id IS NOT NULL;

COMMENT ON INDEX public.idx_project_milestones_depends_on IS 
  'Partial index for milestone dependencies (self-referential FK) - Performance Layer';

-- ============================================================================
-- B2) REMOVE DUPLICATE INDEXES (keep idx_* names, drop old _idx variants)
-- ============================================================================

-- Remove duplicate: tasks_project_id_idx (keep idx_tasks_project_id)
-- Rationale: Two identical indexes on tasks(project_id) - wastes storage and slows writes
-- Note: The newer idx_tasks_project_id is kept (created in recent migrations)
DROP INDEX CONCURRENTLY IF EXISTS public.tasks_project_id_idx;

-- Remove duplicate: tasks_status_idx (keep idx_tasks_status)
-- Rationale: Two identical indexes on tasks(status) - wastes storage and slows writes
-- Note: The newer idx_tasks_status is kept (created in recent migrations)
DROP INDEX CONCURRENTLY IF EXISTS public.tasks_status_idx;

-- ============================================================================
-- POST-MIGRATION VERIFICATION (Run these manually after all statements)
-- ============================================================================

-- Verify new indexes exist
-- SELECT indexname, indexdef FROM pg_indexes 
-- WHERE tablename = 'tag_assignments' AND indexname = 'idx_tag_assignments_tag_id_studio_id';

-- SELECT indexname, indexdef FROM pg_indexes 
-- WHERE tablename = 'project_milestones' AND indexname = 'idx_project_milestones_depends_on';

-- Verify duplicates are gone
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'tasks' AND indexname IN ('tasks_project_id_idx', 'tasks_status_idx');
-- (Should return 0 rows)

-- Check remaining indexes on tasks
-- SELECT indexname FROM pg_indexes WHERE tablename = 'tasks' ORDER BY indexname;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- If you need to rollback the new indexes (recreate the old ones):
-- CREATE INDEX CONCURRENTLY tasks_project_id_idx ON public.tasks(project_id);
-- CREATE INDEX CONCURRENTLY tasks_status_idx ON public.tasks(status);
-- DROP INDEX CONCURRENTLY public.idx_tag_assignments_tag_id_studio_id;
-- DROP INDEX CONCURRENTLY public.idx_project_milestones_depends_on;

-- ============================================================================
-- EXECUTION CHECKLIST
-- ============================================================================
-- [ ] Ensure no active long-running queries on affected tables
-- [ ] Run each CREATE INDEX CONCURRENTLY statement separately
-- [ ] Verify successful creation before proceeding to DROP statements
-- [ ] Run each DROP INDEX CONCURRENTLY statement separately
-- [ ] Run verification queries to confirm changes
-- [ ] Check Supabase Performance Advisor for improvements


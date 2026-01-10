-- ============================================================================
-- RECONCILE: Ensure tasks.studio_id is properly populated and NOT NULL
-- ============================================================================
-- Issue: App expects tasks.studio_id to always be present for studio-scoped queries
-- but it may be nullable in live DB. Safe backfill + set NOT NULL.
-- ============================================================================

-- Backfill studio_id from projects for any tasks missing it
UPDATE public.tasks t
SET studio_id = p.studio_id
FROM public.projects p
WHERE t.project_id = p.id
  AND t.studio_id IS NULL;

-- For any remaining tasks without studio_id (edge case: no project_id)
-- We need to handle this carefully. If client_id exists, use that.
UPDATE public.tasks t
SET studio_id = c.studio_id
FROM public.clients c
WHERE t.client_id = c.id
  AND t.studio_id IS NULL;

-- If there are still any NULL studio_id tasks (orphaned), we should not set NOT NULL yet
-- Check and report (comment for DBA awareness)
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count 
  FROM public.tasks 
  WHERE studio_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % tasks with NULL studio_id after backfill. These are orphaned and should be investigated.', orphaned_count;
  END IF;
END $$;

-- Only set NOT NULL if backfill was successful (no orphans)
-- This is safe because we're using IF with a check
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE studio_id IS NULL LIMIT 1) THEN
    ALTER TABLE public.tasks ALTER COLUMN studio_id SET NOT NULL;
    RAISE NOTICE 'tasks.studio_id set to NOT NULL successfully';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on tasks.studio_id due to orphaned records. Manual cleanup required.';
  END IF;
END $$;

-- Add composite index for common studio + client queries
CREATE INDEX IF NOT EXISTS idx_tasks_studio_client 
  ON public.tasks(studio_id, client_id) 
  WHERE client_id IS NOT NULL;

-- Add composite index for studio + project queries
CREATE INDEX IF NOT EXISTS idx_tasks_studio_project 
  ON public.tasks(studio_id, project_id) 
  WHERE project_id IS NOT NULL;


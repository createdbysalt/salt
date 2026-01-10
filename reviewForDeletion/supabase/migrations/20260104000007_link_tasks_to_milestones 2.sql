-- ============================================================================
-- UPDATE: Link tasks to milestones
-- ============================================================================
-- Adds milestone_id to tasks table so tasks can be grouped by milestone.
-- This is optional (nullable) since not all tasks belong to milestones
-- (e.g., retainer tasks, standalone tasks).
-- ============================================================================

-- Add milestone_id column to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS milestone_id uuid REFERENCES public.project_milestones(id) ON DELETE SET NULL;

-- Add index for milestone queries
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id 
  ON public.tasks(milestone_id) 
  WHERE milestone_id IS NOT NULL;

-- Composite index for project + milestone grouping
CREATE INDEX IF NOT EXISTS idx_tasks_project_milestone 
  ON public.tasks(project_id, milestone_id) 
  WHERE project_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.tasks.milestone_id IS 'Optional milestone this task belongs to (for one-time projects with milestone tracking)';


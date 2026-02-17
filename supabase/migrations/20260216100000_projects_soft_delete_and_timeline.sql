-- ============================================================================
-- Projects: Soft Delete, Archive, and Timeline Support
-- ============================================================================
-- Adds soft delete (30-day retention), archive functionality, and timeline
-- columns to the projects table. Follows the same pattern as clients table.
-- ============================================================================

-- ============================================================================
-- PART 1: Soft Delete & Archive (matches clients pattern)
-- ============================================================================

-- Add columns for soft delete and archive
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- Add comments for documentation
COMMENT ON COLUMN public.projects.archived_at IS 'When project was archived. Archived projects are hidden from active list but fully accessible.';
COMMENT ON COLUMN public.projects.deleted_at IS 'When project was soft deleted. Project will be permanently deleted 30 days after this timestamp.';
COMMENT ON COLUMN public.projects.deleted_by IS 'User who deleted the project (for audit trail).';

-- Index for efficient filtering of archived projects
CREATE INDEX IF NOT EXISTS projects_archived_at_idx
  ON public.projects(studio_id, archived_at)
  WHERE archived_at IS NOT NULL;

-- Index for efficient filtering of deleted projects
CREATE INDEX IF NOT EXISTS projects_deleted_at_idx
  ON public.projects(studio_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Index for querying projects due for permanent deletion
CREATE INDEX IF NOT EXISTS projects_deleted_at_purge_idx
  ON public.projects(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- PART 2: Timeline Support
-- ============================================================================

-- Add start_date for timeline visualization
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS start_date date;

-- Promote deadline from JSONB metadata to first-class column
-- This enables efficient querying and timeline visualization
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deadline date;

-- Add comments
COMMENT ON COLUMN public.projects.start_date IS 'Project start date for timeline visualization.';
COMMENT ON COLUMN public.projects.deadline IS 'Project deadline/end date for timeline visualization.';

-- Index for timeline queries (date range)
CREATE INDEX IF NOT EXISTS projects_timeline_idx
  ON public.projects(studio_id, start_date, deadline)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- PART 3: Board Metrics Support
-- ============================================================================

-- Track when project entered its current status (for "days in stage" metric)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz DEFAULT now();

COMMENT ON COLUMN public.projects.stage_entered_at IS 'When the project entered its current status. Used for "days in stage" board metrics.';

-- Function to auto-update stage_entered_at when status changes
CREATE OR REPLACE FUNCTION public.update_project_stage_entered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.stage_entered_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
DROP TRIGGER IF EXISTS trg_update_project_stage_entered_at ON public.projects;
CREATE TRIGGER trg_update_project_stage_entered_at
  BEFORE UPDATE OF status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_stage_entered_at();

-- ============================================================================
-- PART 4: Migrate Deadline from Metadata (if exists)
-- ============================================================================

-- Copy deadline from metadata.deadline to the new column where applicable
UPDATE public.projects
SET deadline = (metadata->>'deadline')::date
WHERE metadata->>'deadline' IS NOT NULL
  AND deadline IS NULL;

-- ============================================================================
-- Summary of changes:
-- ✅ archived_at, deleted_at, deleted_by columns (soft delete/archive)
-- ✅ start_date column (timeline)
-- ✅ deadline column (promoted from metadata)
-- ✅ stage_entered_at column (board metrics)
-- ✅ Auto-update trigger for stage_entered_at
-- ✅ Migrated existing deadline data from metadata
-- ============================================================================

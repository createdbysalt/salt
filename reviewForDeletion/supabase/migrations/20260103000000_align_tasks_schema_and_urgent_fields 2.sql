-- ============================================================================
-- ALIGN TASKS SCHEMA WITH APP USAGE + ADD URGENT FILTERING
-- ============================================================================
-- The app code already assumes tasks.studio_id, client_id, assigned_to, 
-- due_date, source, metadata exist (see dashboard/tasks/actions.ts and page.tsx).
-- This migration adds missing columns and urgent filtering capabilities.
-- ============================================================================

-- Add missing columns to tasks table
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS studio_id uuid,
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;

-- Add foreign key constraints
ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_studio_id_fkey 
  FOREIGN KEY (studio_id) REFERENCES public.studios(id) ON DELETE CASCADE;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill studio_id from project ownership (for existing tasks)
UPDATE public.tasks t
SET studio_id = p.studio_id
FROM public.projects p
WHERE t.project_id = p.id
  AND t.studio_id IS NULL;

-- Make studio_id NOT NULL after backfill
ALTER TABLE public.tasks 
  ALTER COLUMN studio_id SET NOT NULL;

-- Update priority constraint to include 'revenue_blocker'
ALTER TABLE public.tasks 
  DROP CONSTRAINT IF EXISTS valid_priority;

ALTER TABLE public.tasks 
  ADD CONSTRAINT valid_priority 
  CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'revenue_blocker'));

-- Add constraint for source field
ALTER TABLE public.tasks 
  ADD CONSTRAINT valid_source 
  CHECK (source IN ('internal', 'client_request'));

-- Drop old project_id-based RLS policies (now use studio_id)
DROP POLICY IF EXISTS "Users can view tasks for own projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for own projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for own projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks for own projects" ON public.tasks;

-- Create new studio-based RLS policies
CREATE POLICY "Studio members can view their tasks"
  ON public.tasks FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can update their tasks"
  ON public.tasks FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can delete their tasks"
  ON public.tasks FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Client users can view tasks assigned to them
CREATE POLICY "Client users can view their tasks"
  ON public.tasks FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Core indexes for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_studio_id ON public.tasks(studio_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_source ON public.tasks(source);

-- Composite indexes for Overview page queries
CREATE INDEX IF NOT EXISTS idx_tasks_studio_status ON public.tasks(studio_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_studio_priority ON public.tasks(studio_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_studio_urgent ON public.tasks(studio_id, is_urgent) WHERE is_urgent = true;

-- Partial index for "attention" tasks (open/in_progress with urgency or due date)
CREATE INDEX IF NOT EXISTS idx_tasks_needs_attention ON public.tasks(studio_id, due_date, priority, is_urgent)
  WHERE status IN ('open', 'in_progress') 
    AND (is_urgent = true OR priority IN ('urgent', 'revenue_blocker') OR due_date IS NOT NULL);

-- Index for date-based queries (today, this week)
CREATE INDEX IF NOT EXISTS idx_tasks_studio_due_status ON public.tasks(studio_id, due_date, status)
  WHERE status IN ('open', 'in_progress') AND due_date IS NOT NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.tasks.studio_id IS 'The studio that owns this task';
COMMENT ON COLUMN public.tasks.client_id IS 'Optional client this task is related to';
COMMENT ON COLUMN public.tasks.assigned_to IS 'User ID this task is assigned to';
COMMENT ON COLUMN public.tasks.due_date IS 'Date this task is due';
COMMENT ON COLUMN public.tasks.source IS 'Where the task came from: internal or client_request';
COMMENT ON COLUMN public.tasks.metadata IS 'Additional task metadata as JSON';
COMMENT ON COLUMN public.tasks.is_urgent IS 'Manual urgent flag for high-priority attention';
COMMENT ON CONSTRAINT valid_priority ON public.tasks IS 'Priority levels: low, medium, high, urgent, revenue_blocker';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================



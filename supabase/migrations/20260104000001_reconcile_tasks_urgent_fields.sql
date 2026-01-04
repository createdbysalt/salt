-- ============================================================================
-- RECONCILE: Add urgent/revenue_blocker fields to tasks
-- ============================================================================
-- Issue: App expects tasks.is_urgent and priority='revenue_blocker' 
-- but live DB doesn't have them yet.
-- ============================================================================

-- Add is_urgent column if it doesn't exist
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;

-- Add index for is_urgent queries
CREATE INDEX IF NOT EXISTS idx_tasks_is_urgent 
  ON public.tasks(studio_id, is_urgent) 
  WHERE is_urgent = true;

-- Drop existing priority constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS valid_priority;

-- Recreate with 'revenue_blocker' included
ALTER TABLE public.tasks 
  ADD CONSTRAINT valid_priority 
  CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text, 'revenue_blocker'::text]));

-- Add comments for documentation
COMMENT ON COLUMN public.tasks.is_urgent 
  IS 'Manual urgent flag for high-priority attention (separate from priority field)';

COMMENT ON CONSTRAINT valid_priority ON public.tasks 
  IS 'Priority levels: low, medium, high, urgent, revenue_blocker';


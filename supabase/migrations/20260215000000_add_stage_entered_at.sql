-- ============================================================================
-- Add stage_entered_at column to clients
-- ============================================================================
-- Tracks when a client entered their current lifecycle stage.
-- Used to calculate "days in stage" in the UI.
-- ============================================================================

-- Add the stage_entered_at column
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.stage_entered_at IS 'Timestamp when the client entered their current lifecycle stage. Used to calculate days in stage.';

-- Set initial value for existing clients to their created_at date
UPDATE public.clients
SET stage_entered_at = created_at
WHERE stage_entered_at IS NULL;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS clients_stage_entered_at_idx
  ON public.clients(studio_id, stage_entered_at)
  WHERE stage_entered_at IS NOT NULL;

-- Migration: Add "on_hold" and "lost" lifecycle stages
-- Description: Extends the client pipeline with stages for paused and lost opportunities

-- Drop the existing lifecycle_stage constraint
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_lifecycle_stage_check;

-- Add new constraint with on_hold and lost stages
ALTER TABLE public.clients
ADD CONSTRAINT clients_lifecycle_stage_check CHECK (
  lifecycle_stage IN ('lead', 'discovery', 'pitch', 'active', 'complete', 'on_hold', 'lost', 'archived')
);

-- Update column comment
COMMENT ON COLUMN public.clients.lifecycle_stage IS 'Client lifecycle stage: lead -> discovery -> pitch -> active -> complete | on_hold | lost | archived';

-- Migration complete
-- [check] Added on_hold and lost stages to lifecycle_stage constraint

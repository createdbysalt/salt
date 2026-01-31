-- ============================================================================
-- UPDATE: clients lifecycle_stage constraint
-- ============================================================================
-- Adds new lifecycle stages: 'close' and 'onboard' for the client journey.
-- Full list: lead, discovery, pitch, close, onboard, active, complete, archived
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING CONSTRAINT
-- ============================================================================

-- Drop the existing lifecycle_stage constraint if it exists
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_lifecycle_stage_check;

-- ============================================================================
-- STEP 2: ADD NEW CONSTRAINT WITH UPDATED STAGES
-- ============================================================================

-- Add the updated constraint with all lifecycle stages
ALTER TABLE public.clients
ADD CONSTRAINT clients_lifecycle_stage_check CHECK (
  lifecycle_stage IN ('lead', 'discovery', 'pitch', 'close', 'onboard', 'active', 'complete', 'archived')
);

-- ============================================================================
-- STEP 3: ADD COMMENT FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.clients.lifecycle_stage IS 'Client lifecycle stage: lead -> discovery -> pitch -> close -> onboard -> active -> complete -> archived';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary of changes:
-- [check] Dropped existing lifecycle_stage constraint
-- [check] Added new constraint with stages: lead, discovery, pitch, close, onboard, active, complete, archived
-- [check] New stages enable the full client journey pipeline
--
-- ============================================================================

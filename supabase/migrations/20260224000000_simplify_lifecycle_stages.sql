-- ============================================================================
-- Migration: Simplify lifecycle_stage values
-- ============================================================================
-- Removes: close, onboard, archived
-- Keeps: lead, discovery, pitch, client, complete, on_hold, lost
-- ============================================================================

-- Step 1: Migrate existing data to new stages
-- Move 'close' and 'onboard' to 'pitch' (pre-client stages)
UPDATE public.clients
SET lifecycle_stage = 'pitch'
WHERE lifecycle_stage IN ('close', 'onboard');

-- Move 'archived' to 'lost' (both represent ended relationships)
UPDATE public.clients
SET lifecycle_stage = 'lost'
WHERE lifecycle_stage = 'archived';

-- Step 2: Drop the existing constraint
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_lifecycle_stage_check;

-- Step 3: Add new simplified constraint
ALTER TABLE public.clients
ADD CONSTRAINT clients_lifecycle_stage_check CHECK (
  lifecycle_stage IN ('lead', 'discovery', 'pitch', 'client', 'complete', 'on_hold', 'lost')
);

-- Step 4: Update column comment
COMMENT ON COLUMN public.clients.lifecycle_stage IS 'Client lifecycle stage: lead -> discovery -> pitch -> client -> complete | on_hold | lost';

-- ============================================================================
-- Migration Checklist
-- ============================================================================
-- [x] Migrated 'close' and 'onboard' rows to 'pitch'
-- [x] Migrated 'archived' rows to 'lost'
-- [x] Dropped old constraint
-- [x] Added new constraint with 7 stages
-- [x] Updated column comment

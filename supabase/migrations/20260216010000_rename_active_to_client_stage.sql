-- ============================================================================
-- Migration: Rename lifecycle_stage "active" to "client"
-- ============================================================================
-- Resolves terminology confusion between:
--   - Client STATUS "Active" (not archived)
--   - Client LIFECYCLE STAGE "Client" (paying client, was "active")
-- ============================================================================

-- Step 1: Drop the existing constraint FIRST (so we can update values)
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_lifecycle_stage_check;

-- Step 2: Update existing rows from "active" to "client"
UPDATE public.clients
SET lifecycle_stage = 'client'
WHERE lifecycle_stage = 'active';

-- Step 3: Add updated constraint with "client" instead of "active"
ALTER TABLE public.clients
ADD CONSTRAINT clients_lifecycle_stage_check CHECK (
  lifecycle_stage IN ('lead', 'discovery', 'pitch', 'close', 'onboard', 'client', 'complete', 'on_hold', 'lost', 'archived')
);

-- Step 4: Update column comment
COMMENT ON COLUMN public.clients.lifecycle_stage IS 'Client lifecycle stage: lead -> discovery -> pitch -> close -> onboard -> client -> complete | on_hold | lost | archived. Note: "client" means paying/engaged client (previously "active").';

-- ============================================================================
-- Migration Checklist
-- ============================================================================
-- [x] Renamed lifecycle_stage value "active" to "client" to avoid confusion with status "Active"
-- [x] Dropped constraint first
-- [x] Updated existing rows
-- [x] Added new constraint
-- [x] Updated column comment

-- ============================================================================
-- UPDATE: Add relationship intelligence columns to clients
-- ============================================================================
-- Adds first-class columns for health scoring, status, and contact tracking.
-- Keeps clients.settings for backward compatibility but moves toward structured data.
-- ============================================================================

-- Add new columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  
  -- Optional: for hybrid health score caching (Phase 2)
  ADD COLUMN IF NOT EXISTS health_score_cached smallint,
  ADD COLUMN IF NOT EXISTS health_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS health_factors jsonb;

-- Add constraints
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS valid_client_status;

ALTER TABLE public.clients
  ADD CONSTRAINT valid_client_status CHECK (
    status = ANY (ARRAY['active'::text, 'inactive'::text])
  );

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS valid_health_score;

ALTER TABLE public.clients
  ADD CONSTRAINT valid_health_score CHECK (
    health_score_cached IS NULL OR (health_score_cached >= 0 AND health_score_cached <= 100)
  );

-- ============================================================================
-- BACKFILL from clients.settings JSONB
-- ============================================================================

-- Backfill contact_name from settings.contactName
UPDATE public.clients
SET contact_name = (settings->>'contactName')::text
WHERE settings ? 'contactName'
  AND contact_name IS NULL;

-- Backfill status from settings.status
UPDATE public.clients
SET status = (settings->>'status')::text
WHERE settings ? 'status'
  AND (settings->>'status') IN ('active', 'inactive')
  AND status = 'active'; -- Only update default

-- Backfill last_contact_at from settings.lastContact
UPDATE public.clients
SET last_contact_at = (settings->>'lastContact')::timestamptz
WHERE settings ? 'lastContact'
  AND last_contact_at IS NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Active/inactive filter
CREATE INDEX IF NOT EXISTS idx_clients_status 
  ON public.clients(studio_id, status);

-- Archived clients (soft delete)
CREATE INDEX IF NOT EXISTS idx_clients_archived 
  ON public.clients(studio_id, archived_at) 
  WHERE archived_at IS NOT NULL;

-- Last contact for health score
CREATE INDEX IF NOT EXISTS idx_clients_last_contact 
  ON public.clients(studio_id, last_contact_at) 
  WHERE last_contact_at IS NOT NULL;

-- Cached health score (for Phase 2 sorting)
CREATE INDEX IF NOT EXISTS idx_clients_health_score 
  ON public.clients(studio_id, health_score_cached DESC) 
  WHERE health_score_cached IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.clients.status IS 'Client status: active (current client) or inactive (past client)';
COMMENT ON COLUMN public.clients.archived_at IS 'Soft delete timestamp (clients with archived_at should be filtered out by default)';
COMMENT ON COLUMN public.clients.contact_name IS 'Primary contact name for this client';
COMMENT ON COLUMN public.clients.last_contact_at IS 'Last contact date (updated when meeting completed, request handled, etc.)';
COMMENT ON COLUMN public.clients.health_score_cached IS 'Cached health score (0-100) for performance (Phase 2: updated by triggers/jobs)';
COMMENT ON COLUMN public.clients.health_updated_at IS 'When health_score_cached was last computed';
COMMENT ON COLUMN public.clients.health_factors IS 'JSON explanation of health score factors (for UI explainability)';


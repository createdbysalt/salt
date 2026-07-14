-- ============================================================================
-- EXTEND files TABLE FOR UNIFIED RESOURCES MODEL
-- (Work External Resources Phase 1)
-- ============================================================================
--
-- Files becomes the unified Resources table. Existing files remain as-is
-- (resource_type='file'). External links get proper resource_type detection.
--
-- Key additions:
-- - mode: 'static' (link only) or 'live' (activity monitoring)
-- - resource_type: specific type (github_repo, figma_file, etc.)
-- - resource_id: provider-specific ID for API calls
-- - live_config: JSON config for live mode (events to watch, branch, etc.)
-- - last_activity_at/last_activity_summary: for live mode status display
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add new columns for resource model
-- ---------------------------------------------------------------------------

-- Mode: static (link only) or live (activity monitoring)
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'static'
CHECK (mode IN ('static', 'live'));

-- Resource type: specific type of resource (granular than file_type)
-- file_type='link' + resource_type='github_repo' vs file_type='file' + resource_type='file'
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS resource_type TEXT;

-- Provider-specific ID for API calls (e.g., repo ID, file key)
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS resource_id TEXT;

-- Live mode configuration
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS live_config JSONB DEFAULT '{}';

-- Last activity tracking for live resources
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS last_activity_summary TEXT;

-- Composio trigger subscription ID (Phase 3, but schema-ready)
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS composio_trigger_id TEXT;

-- Provider metadata cache (refresh periodically)
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS provider_metadata JSONB DEFAULT '{}';

-- When provider metadata was last fetched
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS provider_metadata_at TIMESTAMPTZ;

-- Provenance tracking (how was this resource added?)
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
CHECK (source IN ('manual', 'keeper', 'enrichment', 'ask_salt', 'capture'));

-- Confidence score (for AI-added resources)
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS confidence SMALLINT
CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100));

-- Reasoning for AI-added resources
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS because TEXT;

-- ---------------------------------------------------------------------------
-- 2. Migrate existing data
-- ---------------------------------------------------------------------------

-- Set resource_type='file' for uploaded files (file_type='file' or NULL)
UPDATE public.files
SET resource_type = 'file'
WHERE resource_type IS NULL
  AND (file_type = 'file' OR file_type IS NULL);

-- Set resource_type='url' for generic links (file_type='link' without detected type)
UPDATE public.files
SET resource_type = 'url'
WHERE resource_type IS NULL
  AND file_type = 'link';

-- ---------------------------------------------------------------------------
-- 3. Add indexes for common queries
-- ---------------------------------------------------------------------------

-- Index for filtering by mode (live resources)
CREATE INDEX IF NOT EXISTS idx_files_mode
ON public.files(workspace_id, mode)
WHERE mode = 'live';

-- Index for filtering by resource_type
CREATE INDEX IF NOT EXISTS idx_files_resource_type
ON public.files(workspace_id, resource_type);

-- Index for live resources with composio triggers
CREATE INDEX IF NOT EXISTS idx_files_composio_trigger
ON public.files(composio_trigger_id)
WHERE composio_trigger_id IS NOT NULL;

-- Index for resource_id lookups (matching incoming webhooks)
CREATE INDEX IF NOT EXISTS idx_files_resource_id
ON public.files(workspace_id, resource_type, resource_id)
WHERE resource_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Update compatibility view (if it exists)
-- ---------------------------------------------------------------------------

-- The project_files view auto-includes new columns from files.*
-- No action needed unless we want to exclude new columns

-- ---------------------------------------------------------------------------
-- 5. Comments for documentation
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN public.files.mode IS
  'Resource mode: static (link only) or live (activity monitoring via Composio)';

COMMENT ON COLUMN public.files.resource_type IS
  'Specific resource type: file, github_repo, figma_file, linkedin_profile, etc.';

COMMENT ON COLUMN public.files.resource_id IS
  'Provider-specific ID for API calls (repo full name, file key, etc.)';

COMMENT ON COLUMN public.files.live_config IS
  'Live mode config: { events: ["pr_opened"], branch: "main", notify: true }';

COMMENT ON COLUMN public.files.last_activity_at IS
  'Timestamp of last detected activity on this resource';

COMMENT ON COLUMN public.files.last_activity_summary IS
  'Human-readable summary of last activity';

COMMENT ON COLUMN public.files.composio_trigger_id IS
  'Composio trigger subscription ID for live mode';

COMMENT ON COLUMN public.files.provider_metadata IS
  'Cached metadata from provider (PR count, last push, etc.)';

COMMENT ON COLUMN public.files.provider_metadata_at IS
  'When provider_metadata was last refreshed';

COMMENT ON COLUMN public.files.source IS
  'How this resource was added: manual, keeper, enrichment, ask_salt, capture';

COMMENT ON COLUMN public.files.confidence IS
  'AI confidence score (0-100) for keeper/enrichment-added resources';

COMMENT ON COLUMN public.files.because IS
  'Reasoning for AI-added resources';

-- ---------------------------------------------------------------------------
-- 6. Assertions
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'mode'
  ) THEN
    RAISE EXCEPTION 'files.mode column missing after migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'resource_type'
  ) THEN
    RAISE EXCEPTION 'files.resource_type column missing after migration';
  END IF;
END $$;

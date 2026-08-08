-- Repair: files Live-mode resource columns (schema drift fix)
--
-- 20260713220000_extend_files_for_resources.sql is recorded as applied in the
-- migration ledger, but its DDL never ran (same "ledger lies" failure class as
-- the 20260807230500/20260807230600 repairs) — discovered 2026-08-07 when the
-- regenerated types showed none of these 12 columns on files, leaving the
-- entire resources Live-mode subsystem (enable/disable Live mode, resource
-- webhooks → resource_signals) broken at runtime.
--
-- Re-runs the original migration's DDL verbatim; every statement is
-- idempotent, so partial prior application is safe.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'static'
CHECK (mode IN ('static', 'live'));

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS resource_type TEXT;

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS resource_id TEXT;

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS live_config JSONB DEFAULT '{}';

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS last_activity_summary TEXT;

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS composio_trigger_id TEXT;

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS provider_metadata JSONB DEFAULT '{}';

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS provider_metadata_at TIMESTAMPTZ;

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
CHECK (source IN ('manual', 'keeper', 'enrichment', 'ask_salt', 'capture'));

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS confidence SMALLINT
CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100));

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS because TEXT;

-- ---------------------------------------------------------------------------
-- 2. Backfill existing rows (null-guarded, safe to re-run)
-- ---------------------------------------------------------------------------

UPDATE public.files
SET resource_type = 'file'
WHERE resource_type IS NULL
  AND (file_type = 'file' OR file_type IS NULL);

UPDATE public.files
SET resource_type = 'url'
WHERE resource_type IS NULL
  AND file_type = 'link';

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_files_mode
ON public.files(workspace_id, mode)
WHERE mode = 'live';

CREATE INDEX IF NOT EXISTS idx_files_resource_type
ON public.files(workspace_id, resource_type);

CREATE INDEX IF NOT EXISTS idx_files_composio_trigger
ON public.files(composio_trigger_id)
WHERE composio_trigger_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_resource_id
ON public.files(workspace_id, resource_type, resource_id)
WHERE resource_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Column documentation
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
-- 5. Assertions — fail loudly if the repair itself did not land
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'mode'
  ) THEN
    RAISE EXCEPTION 'files.mode column missing after repair migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'composio_trigger_id'
  ) THEN
    RAISE EXCEPTION 'files.composio_trigger_id column missing after repair migration';
  END IF;
END $$;

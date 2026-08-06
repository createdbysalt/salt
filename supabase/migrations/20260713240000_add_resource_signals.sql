-- ============================================================================
-- RESOURCE SIGNALS TABLE
-- (Work External Resources Phase 3)
-- ============================================================================
--
-- Stores activity signals from Live mode resources.
-- Used by playbooks to react to external resource activity.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create resource_signals table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.resource_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Resource that generated this signal
  resource_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,

  -- Entity the resource is bound to
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- Signal details
  signal_key TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',

  -- Processing state
  processed_at TIMESTAMPTZ,
  processed_by TEXT, -- playbook slug that processed it

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

-- Query signals by workspace + entity (for activity feeds)
CREATE INDEX idx_resource_signals_entity
ON public.resource_signals (workspace_id, entity_type, entity_id, created_at DESC);

-- Query signals by resource (for resource detail view)
CREATE INDEX idx_resource_signals_resource
ON public.resource_signals (resource_id, created_at DESC);

-- Query unprocessed signals (for playbook execution)
CREATE INDEX idx_resource_signals_unprocessed
ON public.resource_signals (workspace_id, processed_at)
WHERE processed_at IS NULL;

-- Query signals by type (for playbook triggers)
CREATE INDEX idx_resource_signals_key
ON public.resource_signals (workspace_id, signal_key, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.resource_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_signals"
ON public.resource_signals FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Only service role can insert (from webhook handler)
CREATE POLICY "service_role_can_insert_signals"
ON public.resource_signals FOR INSERT
WITH CHECK (true);

-- Only service role can update (mark as processed)
CREATE POLICY "service_role_can_update_signals"
ON public.resource_signals FOR UPDATE USING (true);

-- Grants
GRANT SELECT ON public.resource_signals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.resource_signals TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Comments
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.resource_signals IS
  'Activity signals from Live mode resources, used by playbooks';

COMMENT ON COLUMN public.resource_signals.signal_key IS
  'Signal type: github_pr_merged, github_push, figma_file_updated, etc.';

COMMENT ON COLUMN public.resource_signals.evidence IS
  'Signal evidence: { prNumber, prTitle, prAuthor, summary, ... }';

COMMENT ON COLUMN public.resource_signals.processed_at IS
  'When a playbook processed this signal (NULL = pending)';

COMMENT ON COLUMN public.resource_signals.processed_by IS
  'Slug of the playbook that processed this signal';

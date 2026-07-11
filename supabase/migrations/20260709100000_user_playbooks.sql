-- ============================================================================
-- User-created playbooks (Phase 3)
-- Plan: 2026-07-03-playbook-authoring-and-ask-salt.md
-- ============================================================================
--
-- Extends playbook_blueprints to support workspace-scoped user-created playbooks.
-- - workspace_id: NULL = global Salt-authored, UUID = workspace-scoped
-- - origin: 'salt' = Salt-authored (system), 'user' = user-created
--
-- RLS: workspace members can read/write their own; global rows are read-only.
-- General player created per-workspace on first user playbook save.
-- ============================================================================

-- Add workspace_id and origin columns
ALTER TABLE public.playbook_blueprints
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'salt'
    CHECK (origin IN ('salt', 'user'));

-- Index for workspace-scoped queries
CREATE INDEX IF NOT EXISTS idx_playbook_blueprints_workspace
  ON public.playbook_blueprints(workspace_id)
  WHERE workspace_id IS NOT NULL;

-- Enable RLS on playbook_blueprints (was previously global-only, no RLS)
ALTER TABLE public.playbook_blueprints ENABLE ROW LEVEL SECURITY;

-- Global (Salt-authored) blueprints: everyone can read
CREATE POLICY "global_blueprints_read"
  ON public.playbook_blueprints FOR SELECT
  USING (workspace_id IS NULL);

-- Workspace blueprints: members can read
CREATE POLICY "workspace_blueprints_read"
  ON public.playbook_blueprints FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace blueprints: members can insert
CREATE POLICY "workspace_blueprints_insert"
  ON public.playbook_blueprints FOR INSERT
  WITH CHECK (
    workspace_id IS NOT NULL AND
    origin = 'user' AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace blueprints: members can update their own
CREATE POLICY "workspace_blueprints_update"
  ON public.playbook_blueprints FOR UPDATE
  USING (
    workspace_id IS NOT NULL AND
    origin = 'user' AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace blueprints: members can delete their own
CREATE POLICY "workspace_blueprints_delete"
  ON public.playbook_blueprints FOR DELETE
  USING (
    workspace_id IS NOT NULL AND
    origin = 'user' AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Add kind column to playbook_blueprints (was implicit in player_slug)
-- Acting playbooks can be user-created; profile playbooks are keeper-only
ALTER TABLE public.playbook_blueprints
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'acting'
    CHECK (kind IN ('acting', 'profile'));

-- Backfill existing blueprints: keeper = profile, others = acting
UPDATE public.playbook_blueprints
SET kind = CASE
  WHEN player_slug = 'keeper' THEN 'profile'
  ELSE 'acting'
END
WHERE kind = 'acting';

-- Comment on the dual-scope model
COMMENT ON COLUMN public.playbook_blueprints.workspace_id IS
  'NULL = global Salt-authored blueprint; UUID = workspace-scoped user-created blueprint';

COMMENT ON COLUMN public.playbook_blueprints.origin IS
  'salt = Salt-authored (system), user = user-created. User playbooks are always workspace-scoped.';

COMMENT ON COLUMN public.playbook_blueprints.kind IS
  'acting = performs external actions (email, calendar); profile = fills Memory records (keeper-only)';

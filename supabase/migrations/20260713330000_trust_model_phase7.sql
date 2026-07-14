-- Phase 7: Trust Model & Approval Gates
-- Adds "trust" level and workspace tool preferences for granular approval control
--
-- Trust Levels:
--   read_only       - Salt can only read, never act
--   ask             - Every action requires approval (renamed from act_with_approval)
--   trust           - Actions auto-execute unless tool/step requires approval
--
-- See: docs/plans/2026-07-13-scalable-connectors.md Phase 7

-- ============================================================================
-- Part 1: Add 'trust' to workspace trust_level
-- ============================================================================

-- Drop and recreate the CHECK constraint to add 'trust'
ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_trust_level_check;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_trust_level_check
  CHECK (trust_level IN ('read_only', 'act_with_approval', 'trust'));

-- Also update the legacy constraint on workspace_integrations if it exists
ALTER TABLE public.workspace_integrations
  DROP CONSTRAINT IF EXISTS workspace_integrations_trust_level_check;

ALTER TABLE public.workspace_integrations
  ADD CONSTRAINT workspace_integrations_trust_level_check
  CHECK (trust_level IN ('read_only', 'act_with_approval', 'trust'));

COMMENT ON COLUMN public.workspaces.trust_level IS
  'Workspace-global trust level: read_only (can''t act), act_with_approval (always asks), trust (auto-executes respecting tool/step gates)';

-- ============================================================================
-- Part 2: Workspace tool preferences (per-tool approval overrides)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_tool_preferences (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tool_slug text NOT NULL,
  requires_approval boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (workspace_id, tool_slug)
);

-- Index for lookups by workspace
CREATE INDEX IF NOT EXISTS idx_workspace_tool_prefs_workspace
  ON public.workspace_tool_preferences(workspace_id);

-- RLS: workspace members can view, admins/owners can modify
ALTER TABLE public.workspace_tool_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_tool_prefs"
  ON public.workspace_tool_preferences
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_admins_can_manage_tool_prefs"
  ON public.workspace_tool_preferences
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE public.workspace_tool_preferences IS
  'Per-workspace overrides for tool approval requirements. In Trust mode, these override tool_classifications defaults.';

COMMENT ON COLUMN public.workspace_tool_preferences.requires_approval IS
  'If true, this tool requires approval even in Trust mode. Can only escalate (true), never downgrade destructive tools.';

-- ============================================================================
-- Part 3: Ensure tool_classifications has sensible defaults
-- ============================================================================

-- Update requires_human_confirmation based on risk class for tools that
-- don't have it explicitly set (heuristic default)
-- destructive = always true (hard floor)
-- mutating = true by default (user can override in Trust mode)
-- read = false (auto-execute in Trust mode)

UPDATE public.tool_classifications
SET requires_human_confirmation = true
WHERE risk = 'destructive'
  AND requires_human_confirmation = false;

-- Note: We don't automatically set mutating=true or read=false here
-- because existing classifications may have been manually set.
-- The heuristic in tool-classification-heuristics.ts handles new tools.

-- ============================================================================
-- Part 4: Play execution state for checkpoint/pause/resume
-- ============================================================================

-- Add paused state to play_runs for approval checkpoints
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS paused_at_step integer,
  ADD COLUMN IF NOT EXISTS paused_for_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_context jsonb;

COMMENT ON COLUMN public.play_runs.paused_at_step IS
  'When paused_for_approval=true, the step index where execution paused waiting for user approval';

COMMENT ON COLUMN public.play_runs.paused_for_approval IS
  'True when playbook execution is paused at an approval gate, waiting for user action';

COMMENT ON COLUMN public.play_runs.approval_context IS
  'Context for the pending approval: tool_slug, step details, prepared action preview';

-- Index for finding plays needing approval
CREATE INDEX IF NOT EXISTS idx_play_runs_needs_approval
  ON public.play_runs(workspace_id, paused_for_approval)
  WHERE paused_for_approval = true;

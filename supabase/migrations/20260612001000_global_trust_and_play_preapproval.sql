-- Global trust switch + Play pre-approval contract
-- (docs/plans/2026-06-11-global-trust-and-play-preapproval.md)

-- Part 1: trust level moves from per-connector to workspace-global.
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS trust_level text NOT NULL DEFAULT 'read_only'
  CHECK (trust_level IN ('read_only', 'act_with_approval'));

-- Backfill most-permissive: if the user deliberately enabled acting on ANY
-- connector, the workspace keeps that capability under the global switch.
UPDATE public.workspaces w
SET trust_level = 'act_with_approval'
WHERE EXISTS (
  SELECT 1 FROM public.workspace_integrations wi
  WHERE wi.workspace_id = w.id
    AND wi.trust_level = 'act_with_approval'
);

-- workspace_integrations.trust_level is now legacy; kept until the global
-- switch ships end-to-end, then dropped in a follow-up migration.

-- Part 2: Play pre-approval. Enabling a play consents to its declared
-- actions; play steps then execute those slugs without per-action approval.

-- Audit log gains the "play" source for pre-approved play executions.
ALTER TABLE public.workspace_tool_executions
  DROP CONSTRAINT IF EXISTS workspace_tool_executions_source_check;
ALTER TABLE public.workspace_tool_executions
  ADD CONSTRAINT workspace_tool_executions_source_check
  CHECK (source IN ('ask_salt', 'server_action', 'background', 'play'));
ALTER TABLE public.play_templates
  ADD COLUMN IF NOT EXISTS required_actions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approved_actions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS actions_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actions_approved_at timestamptz;

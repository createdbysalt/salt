-- ============================================================================
-- Migration: Workspace tool execution audit log
-- ============================================================================
--
-- Records every Composio tool execution Salt performs on a workspace's behalf
-- (auto-executed reads, human-approved mutations, and blocked attempts) so
-- users can see exactly what Salt did with their connected accounts.
--
-- Writes happen exclusively server-side via the service role; the table is
-- append-only for the app (no authenticated INSERT/UPDATE/DELETE policies).
-- Workspace owners/admins can read their own workspace's log.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_tool_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Who triggered the execution; NULL for unattended/background contexts.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Who approved a mutating execution; NULL for auto-executed read tools.
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tool_slug text NOT NULL,
  -- Connector provider key (gmail, googlecalendar, ...) for filtering.
  provider text,
  risk text NOT NULL CHECK (risk IN ('read', 'mutating', 'destructive')),
  source text NOT NULL DEFAULT 'server_action'
    CHECK (source IN ('ask_salt', 'server_action', 'background')),
  status text NOT NULL CHECK (status IN ('success', 'error', 'blocked')),
  -- Redacted/summarized arguments. Never store secrets; cap size at the app
  -- layer. Mutating tools should record enough to reconstruct what happened
  -- (recipients, subject, event times) without persisting full bodies.
  args_summary jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT workspace_tool_executions_error_length CHECK (char_length(error) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_workspace_tool_executions_workspace_created
  ON public.workspace_tool_executions(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_tool_executions_workspace_provider
  ON public.workspace_tool_executions(workspace_id, provider, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.workspace_tool_executions ENABLE ROW LEVEL SECURITY;

-- Owners and admins can read their workspace's audit log. No INSERT/UPDATE/
-- DELETE policies: the log is written by the service role and is immutable
-- from the client.
CREATE POLICY "Workspace admins can view tool executions"
  ON public.workspace_tool_executions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

GRANT SELECT ON public.workspace_tool_executions TO authenticated;

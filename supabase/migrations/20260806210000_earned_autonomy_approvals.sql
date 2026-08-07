-- Earned autonomy (Capture Quality Repair, Phase C2 / GROW).
-- Per-(workspace, playbook, tool) approval counter. Steps marked
-- needsApproval pause for approval until the user has approved the same
-- playbook+tool combination enough times (threshold enforced in
-- app/_features/plays/services/earned-autonomy.ts), after which the step
-- runs silently — proposal first, earned autonomy after consistent approvals.

CREATE TABLE IF NOT EXISTS public.playbook_action_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  playbook_slug TEXT NOT NULL,
  tool_slug TEXT NOT NULL,
  approved_count INTEGER NOT NULL DEFAULT 0,
  last_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, playbook_slug, tool_slug)
);

CREATE INDEX IF NOT EXISTS playbook_action_approvals_lookup_idx
  ON public.playbook_action_approvals(workspace_id, playbook_slug, tool_slug);

CREATE TRIGGER set_playbook_action_approvals_updated_at
  BEFORE UPDATE ON public.playbook_action_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.playbook_action_approvals ENABLE ROW LEVEL SECURITY;

-- Members can read their workspace's autonomy state (e.g. to show progress
-- toward earned autonomy). Writes go through the service role only — the
-- counter is bumped server-side when an approval actually executes.
DROP POLICY IF EXISTS "workspace_members_view_action_approvals" ON public.playbook_action_approvals;
CREATE POLICY "workspace_members_view_action_approvals" ON public.playbook_action_approvals
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

COMMENT ON TABLE public.playbook_action_approvals IS
  'Earned-autonomy counters: how many times a workspace approved a given playbook+tool action. Flips needsApproval off past the threshold.';

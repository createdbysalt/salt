-- ============================================================================
-- Player Context: per-workspace, per-player shared context
-- Plan: Playbook Authoring v2 (Phase 2.6)
-- ============================================================================

-- Player context stores domain knowledge, preferences, and tone that all
-- playbooks for a given player share. Replaces per-playbook references/domain.md
-- duplication and makes user-created playbooks inherit domain competence.
CREATE TABLE IF NOT EXISTS public.player_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  player_slug text NOT NULL,
  -- Domain knowledge: industry terms, common entities, business rules
  domain_knowledge text,
  -- Tone preferences: how this player should communicate
  tone_preferences text,
  -- Workflow preferences: timing, channels, approval patterns
  workflow_preferences text,
  -- Raw context doc for LLM injection (budgeted, like assembleOperatorContext)
  context_doc text,
  -- Char budget for context_doc injection (default 1500, mirror operator context)
  context_budget integer NOT NULL DEFAULT 1500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, player_slug)
);

CREATE INDEX IF NOT EXISTS idx_player_context_workspace
  ON public.player_context(workspace_id);

COMMENT ON TABLE public.player_context IS
  'Per-workspace, per-player shared context (domain knowledge, preferences, tone). Injected into all playbook runs for that player.';

-- RLS: workspace members can view/edit their workspace's player context
ALTER TABLE public.player_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_player_context"
  ON public.player_context FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_manage_player_context"
  ON public.player_context FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

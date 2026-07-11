-- ============================================================================
-- Play pacing guard hits log (Phase 3 coordination seed)
-- Plan: 2026-07-03-playbook-authoring-and-ask-salt.md
-- ============================================================================
--
-- Logs when the outbound pacing guard blocks a play from targeting a recipient
-- that was already contacted within 24h. This data informs future dispatcher
-- design — once we have collision patterns, we can build smarter coordination.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.play_pacing_guard_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  blocked_run_id uuid NOT NULL REFERENCES public.play_runs(id) ON DELETE CASCADE,
  blocking_run_id uuid NOT NULL REFERENCES public.play_runs(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL,
  recipient_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_play_pacing_guard_hits_workspace
  ON public.play_pacing_guard_hits(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_play_pacing_guard_hits_recipient
  ON public.play_pacing_guard_hits(workspace_id, recipient_type, recipient_id);

ALTER TABLE public.play_pacing_guard_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_pacing_hits"
  ON public.play_pacing_guard_hits FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.play_pacing_guard_hits IS
  'Logs pacing guard hits for future dispatcher design. Records when a play was blocked because the recipient was contacted within 24h.';

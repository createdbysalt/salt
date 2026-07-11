-- ============================================================================
-- Play run trigger source: observability for "why did this play fire"
-- Plan: Playbook Authoring v2 (Phase 2.7)
-- ============================================================================

-- Track what triggered each play run (signal/schedule/pattern/chat/manual)
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS trigger_source text;

-- Optional: evidence reference for signal/pattern triggers
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS trigger_evidence jsonb;

COMMENT ON COLUMN public.play_runs.trigger_source IS
  'What fired this play: signal | schedule | pattern | chat | manual. Null for legacy runs.';

COMMENT ON COLUMN public.play_runs.trigger_evidence IS
  'Evidence for signal/pattern triggers: capture ID, signal key, predicate values.';

-- Index for filtering by trigger type
CREATE INDEX IF NOT EXISTS idx_play_runs_trigger_source
  ON public.play_runs(workspace_id, trigger_source)
  WHERE trigger_source IS NOT NULL;

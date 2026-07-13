-- ============================================================================
-- Play runs: queue + stakes columns for two-queue routing
-- Plan: 2026-07-10-learn-act-grow-loop.md (Phase 2)
-- ============================================================================
--
-- Adds the queue and stakes columns needed for the confidence × stakes matrix:
--
-- | Confidence / Stakes | Low Stakes      | High Stakes  |
-- |---------------------|-----------------|--------------|
-- | High (≥0.90)        | auto_handled    | needs_you    |
-- | Medium (0.70-0.90)  | auto_handled+   | needs_you    |
-- | Low (<0.70)         | accumulate      | accumulate   |
--
-- Stakes classification:
-- - high: Send email, create invoice, book meeting, publish external
-- - medium: Update Memory fields, create draft
-- - low: Internal enrichment, capture ingestion, signal accumulation

-- Queue: which list this play appears in
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS queue text DEFAULT 'needs_you'
  CHECK (queue IN ('needs_you', 'auto_handled'));

-- Stakes: action risk level for routing decisions
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS stakes text
  CHECK (stakes IN ('low', 'medium', 'high'));

-- Ask Salt / source attribution context (extends context_inputs)
-- Stores: {source: 'ask_salt' | 'playbook' | 'manual', chat_id?, message_id?, user_approved_at?}
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS source_context jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.play_runs.queue IS
  'Which queue this play appears in: needs_you (pending approval) or auto_handled (done, visible)';

COMMENT ON COLUMN public.play_runs.stakes IS
  'Action risk level: low (internal), medium (draft/memory), high (external/financial)';

COMMENT ON COLUMN public.play_runs.source_context IS
  'Attribution: {source, chat_id, message_id, user_approved_at} for Ask Salt; {playbook_slug, trigger_signal} for playbooks';

-- Index for queue filtering (most common query path)
CREATE INDEX IF NOT EXISTS idx_play_runs_queue
  ON public.play_runs(workspace_id, queue, state)
  WHERE queue IS NOT NULL;

-- Index for stakes filtering (admin/analytics)
CREATE INDEX IF NOT EXISTS idx_play_runs_stakes
  ON public.play_runs(workspace_id, stakes)
  WHERE stakes IS NOT NULL;

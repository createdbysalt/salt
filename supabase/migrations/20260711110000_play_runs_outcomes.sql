-- ============================================================================
-- Play runs: outcome tracking for GROW loop calibration
-- Plan: 2026-07-10-learn-act-grow-loop.md (Phase 6)
-- ============================================================================
--
-- Tracks what happened after each play to feed the GROW loop:
-- - outcome_expected: what we're watching for (reply, payment, booking)
-- - outcome_window_hours: how long to wait before timing out
-- - outcome_type: what actually happened (positive, negative, neutral, timeout)
-- - outcome_at: when the outcome was detected
-- - user_feedback: explicit thumbs up/down from user
-- - evidence_ids: links to entity_evidence that triggered this play

-- Expected outcome type (what we're watching for)
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS outcome_expected text;

-- How long to wait for the outcome (hours)
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS outcome_window_hours integer;

-- What actually happened
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS outcome_type text
  CHECK (outcome_type IN ('positive', 'negative', 'neutral', 'timeout'));

-- When the outcome was detected
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS outcome_at timestamptz;

-- Explicit user feedback (thumbs up/down)
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS user_feedback text
  CHECK (user_feedback IN ('positive', 'negative'));

-- When the user gave feedback
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS user_feedback_at timestamptz;

-- Links to entity_evidence records that produced this play
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS evidence_ids uuid[] DEFAULT '{}';

COMMENT ON COLUMN public.play_runs.outcome_expected IS
  'What outcome we expect: reply, payment, booking, confirmation, etc.';

COMMENT ON COLUMN public.play_runs.outcome_window_hours IS
  'Hours to wait before marking as timeout (default varies by outcome type)';

COMMENT ON COLUMN public.play_runs.outcome_type IS
  'What actually happened: positive (goal met), negative (rejected/undone), neutral (no signal), timeout (window expired)';

COMMENT ON COLUMN public.play_runs.outcome_at IS
  'When the outcome was detected or the window expired';

COMMENT ON COLUMN public.play_runs.user_feedback IS
  'Explicit feedback from user: positive (helpful) or negative (not helpful)';

COMMENT ON COLUMN public.play_runs.user_feedback_at IS
  'When the user submitted feedback';

COMMENT ON COLUMN public.play_runs.evidence_ids IS
  'UUIDs of entity_evidence records that triggered this play (for evidence → play traceability)';

-- Index for outcome tracking queries
CREATE INDEX IF NOT EXISTS idx_play_runs_outcome_pending
  ON public.play_runs(workspace_id, outcome_expected, state)
  WHERE outcome_expected IS NOT NULL AND outcome_type IS NULL;

-- Index for feedback analysis
CREATE INDEX IF NOT EXISTS idx_play_runs_feedback
  ON public.play_runs(workspace_id, user_feedback)
  WHERE user_feedback IS NOT NULL;

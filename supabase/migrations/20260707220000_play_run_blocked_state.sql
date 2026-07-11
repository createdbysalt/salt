-- ============================================================================
-- Add 'blocked' state to play_runs for toolkit reconnection scenarios
-- Plan: Playbook Authoring v2 (Phase 2.5)
-- ============================================================================

-- Update the state check constraint to include 'blocked'
ALTER TABLE public.play_runs
  DROP CONSTRAINT IF EXISTS play_runs_state_check;

ALTER TABLE public.play_runs
  ADD CONSTRAINT play_runs_state_check
  CHECK (state IN ('draft', 'queued', 'approved', 'scheduled', 'executing', 'ran', 'failed', 'blocked', 'dismissed'));

COMMENT ON COLUMN public.play_runs.state IS
  'draft = not ready, queued = pending approval, approved/scheduled = ready, executing = in progress, ran = done, failed = error, blocked = waiting on reconnect, dismissed = skipped';

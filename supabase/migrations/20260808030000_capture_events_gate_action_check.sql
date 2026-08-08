-- ============================================================================
-- capture_events.gate_action vocabulary (Sources plan 2.10)
-- ============================================================================
--
-- gate_action was unconstrained TEXT: a typo in a future writer ('niose',
-- 'dropped') would be invisible to the DB and silently break every consumer
-- that filters on the vocabulary — the stream query, the budget count, the
-- Memory Filter buckets. Live data on both environments holds only
-- NULL / 'noise' / 'held', so this validates immediately.
--
-- Vocabulary: 'drop' (pre-ingest block; today returned before insert, kept
-- for legacy rows and explicit stamping), 'signal' (known-entity fast-track),
-- 'candidate' (admission-scored), 'noise' (low signal / budget-stamped),
-- 'held' (Memory-first thin row). NULL = pre-gate legacy path.

ALTER TABLE public.capture_events
  ADD CONSTRAINT capture_events_gate_action_check
  CHECK (gate_action IS NULL
         OR gate_action IN ('drop', 'signal', 'candidate', 'noise', 'held'));

-- Keeper Auto-Execute Threshold Setting (Confidence-Gated Execution Phase 2)
--
-- User-controlled threshold for when keepers auto-execute vs accumulate.
-- Lower = more autonomy, higher = more cautious.

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS keeper_auto_execute_threshold SMALLINT
  DEFAULT 85
  CHECK (keeper_auto_execute_threshold >= 50 AND keeper_auto_execute_threshold <= 100);

COMMENT ON COLUMN workspaces.keeper_auto_execute_threshold IS
'User-controlled confidence threshold (50-100) for keeper auto-execution. Default 85. Lower = more autonomous.';

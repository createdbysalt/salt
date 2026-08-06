-- Retire players table
-- Players have been replaced by sections in the playbook architecture.
-- See: section-capabilities.ts, terminology-engineering.md
--
-- Note: play_templates was already dropped in 20260713150000_retire_v1_playbooks.sql

-- Step 1: Drop FK constraints from play_runs → players
ALTER TABLE play_runs DROP CONSTRAINT IF EXISTS play_runs_player_id_fkey;
ALTER TABLE play_runs DROP CONSTRAINT IF EXISTS play_runs_prepared_by_player_id_fkey;

-- Step 2: Add deprecation comment to player_id column (kept for historical data)
COMMENT ON COLUMN play_runs.player_id IS
  'DEPRECATED 2026-07-13: Players replaced by sections. Use metadata or source_context instead. Column retained for historical data only.';

-- Step 3: Drop the players table
DROP TABLE IF EXISTS players;

-- Note: play_runs.player_id column is retained but orphaned.
-- Future migration can drop it after code cleanup is complete.

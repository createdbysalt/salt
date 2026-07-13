-- Retire Players: Move from player-based to section-based playbook grouping
--
-- Players (keeper, billing, follow-up, etc.) are being replaced by sections
-- (relationships, work, billing, files, meetings, me, connections, notes, _meta).
--
-- This migration:
-- 1. Adds `section` column to playbook_blueprints
-- 2. Makes `player_slug` nullable (for backwards compatibility)
-- 3. Populates `section` from existing player_slug mappings
-- 4. Drops the player_context table (unused)

-- Add section column to playbook_blueprints
ALTER TABLE playbook_blueprints
ADD COLUMN IF NOT EXISTS section text;

-- Make player_slug nullable
ALTER TABLE playbook_blueprints
ALTER COLUMN player_slug DROP NOT NULL;

-- Populate section from player_slug using the mapping:
-- keeper -> _meta (system/memory playbooks)
-- billing -> billing
-- follow-up -> relationships
-- brief -> _meta
-- client-risk -> relationships
-- scope -> work
-- general -> _meta
UPDATE playbook_blueprints
SET section = CASE player_slug
  WHEN 'keeper' THEN '_meta'
  WHEN 'billing' THEN 'billing'
  WHEN 'follow-up' THEN 'relationships'
  WHEN 'brief' THEN '_meta'
  WHEN 'client-risk' THEN 'relationships'
  WHEN 'scope' THEN 'work'
  WHEN 'general' THEN '_meta'
  ELSE '_meta'
END
WHERE section IS NULL;

-- Drop player_context table if it exists (recent addition, not in use)
DROP TABLE IF EXISTS player_context;

-- Add comment documenting the deprecation
COMMENT ON COLUMN playbook_blueprints.player_slug IS 'DEPRECATED: Use section column instead. Players retired 2026-07-12.';
COMMENT ON COLUMN playbook_blueprints.section IS 'Section-based playbook grouping: relationships, work, billing, files, meetings, me, connections, notes, _meta';

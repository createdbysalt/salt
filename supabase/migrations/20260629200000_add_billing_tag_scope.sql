-- ============================================================================
-- Add billing scope to workspace_tags and entity_tag_assignments
-- ============================================================================
-- Allows tags to be scoped to billing records (invoices and payables)

-- Update workspace_tags scope constraint
ALTER TABLE workspace_tags
  DROP CONSTRAINT IF EXISTS workspace_tags_scope_check;

ALTER TABLE workspace_tags
  ADD CONSTRAINT workspace_tags_scope_check
  CHECK (scope IN ('person', 'org', 'work', 'billing', 'all'));

-- Update entity_tag_assignments entity_type constraint
ALTER TABLE entity_tag_assignments
  DROP CONSTRAINT IF EXISTS entity_tag_assignments_entity_type_check;

ALTER TABLE entity_tag_assignments
  ADD CONSTRAINT entity_tag_assignments_entity_type_check
  CHECK (entity_type IN ('person', 'org', 'work', 'billing'));

COMMENT ON COLUMN workspace_tags.scope IS 'Which entity types this tag applies to: person, org, work, billing, or all';

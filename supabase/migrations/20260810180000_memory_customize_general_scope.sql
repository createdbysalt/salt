-- Memory Customize: "general" scope
--
-- The Customize surface gains a General page alongside the per-record-type
-- pages. Lines written there steer every record type, so entity_type must
-- admit 'general' alongside the canonical record types. Non-destructive:
-- the CHECK is dropped and re-created wider; existing rows are untouched.

ALTER TABLE memory_customize_entries
  DROP CONSTRAINT memory_customize_entries_entity_type_check;

ALTER TABLE memory_customize_entries
  ADD CONSTRAINT memory_customize_entries_entity_type_check
  CHECK (entity_type IN ('general', 'person', 'org', 'work', 'meeting', 'resource'));

COMMENT ON COLUMN memory_customize_entries.entity_type IS 'Canonical app vocabulary (person, org, work, meeting, resource) or general — general lines steer every record type';

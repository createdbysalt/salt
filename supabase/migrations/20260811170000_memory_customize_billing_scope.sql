-- Memory Customize: "billing" scope
--
-- Billing joins the Customize surface as its own page alongside the other
-- record types, so entity_type must admit 'billing'. Non-destructive: the
-- CHECK is dropped and re-created wider; existing rows are untouched.

ALTER TABLE memory_customize_entries
  DROP CONSTRAINT memory_customize_entries_entity_type_check;

ALTER TABLE memory_customize_entries
  ADD CONSTRAINT memory_customize_entries_entity_type_check
  CHECK (entity_type IN ('general', 'person', 'org', 'work', 'meeting', 'resource', 'billing'));

COMMENT ON COLUMN memory_customize_entries.entity_type IS 'Canonical app vocabulary (person, org, work, meeting, resource, billing) or general — general lines steer every record type';

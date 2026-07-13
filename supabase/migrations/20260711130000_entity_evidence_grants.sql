-- Grant table access to authenticated role
-- RLS policies handle row-level filtering, but the role needs table access first

GRANT SELECT, INSERT, UPDATE ON entity_evidence TO authenticated;
GRANT ALL ON entity_evidence TO service_role;

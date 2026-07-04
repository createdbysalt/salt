-- ============================================================================
-- PROVENANCE FOR THE ME RECORD (keeper-field-contracts Phase 6.5)
-- ============================================================================
--
-- profile_field_provenance and lifecycle_events CHECK entity_type IN
-- ('person','organization','work') — so operator (profiles) and workspace
-- (business profile) writes could not record provenance, and the Me activity
-- timeline could not truthfully render identity/business changes.
--
-- Widens both CHECKs with 'operator' and 'workspace'. Drop-by-column (names
-- drift after renames in this repo).
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.drop_column_checks(p_table regclass, p_column text)
RETURNS void AS $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = p_table
      AND con.contype = 'c'
      AND EXISTS (
        SELECT 1 FROM unnest(con.conkey) AS k
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k
        WHERE a.attname = p_column
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', p_table, c.conname);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT pg_temp.drop_column_checks('public.profile_field_provenance', 'entity_type');
ALTER TABLE public.profile_field_provenance
  ADD CONSTRAINT profile_field_provenance_entity_type_check CHECK (
    entity_type IN ('person', 'organization', 'work', 'operator', 'workspace')
  );

SELECT pg_temp.drop_column_checks('public.lifecycle_events', 'entity_type');
ALTER TABLE public.lifecycle_events
  ADD CONSTRAINT lifecycle_events_entity_type_check CHECK (
    entity_type IN ('person', 'organization', 'work', 'operator', 'workspace')
  );

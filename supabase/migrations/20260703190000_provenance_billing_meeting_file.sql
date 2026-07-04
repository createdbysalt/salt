-- ============================================================================
-- PROVENANCE FOR BILLING / MEETING / FILE RECORDS
-- (closes the "billing field-edit provenance" gap from keeper Phase 6.3)
-- ============================================================================
--
-- profile_field_provenance's entity_type CHECK now admits every memory
-- record type that has editable fields, so inline edits on Billing,
-- Meetings, and Files detail pages can record provenance and render on
-- their Activity timelines like every other record.
-- (relations dialect: billing_record; provenance rows follow the same
-- long-ish dialect already used by 'organization'.)
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
    entity_type IN (
      'person', 'organization', 'work', 'operator', 'workspace',
      'billing_record', 'meeting', 'file'
    )
  );

SELECT pg_temp.drop_column_checks('public.lifecycle_events', 'entity_type');
ALTER TABLE public.lifecycle_events
  ADD CONSTRAINT lifecycle_events_entity_type_check CHECK (
    entity_type IN (
      'person', 'organization', 'work', 'operator', 'workspace',
      'billing_record', 'meeting', 'file'
    )
  );

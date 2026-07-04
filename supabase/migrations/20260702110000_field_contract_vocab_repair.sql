-- ============================================================================
-- FIELD CONTRACT VOCABULARY REPAIR (Phase 0.4 of keeper-field-contracts)
-- ============================================================================
--
-- Aligns DB constraints with the canonical vocabularies decided in
-- .cursor/plans/2026-07-02-keeper-field-contracts.md (decision table).
-- Additive / data-safe changes only:
--
--   1. people.relationship_type CHECK gains 'lead' + 'past_client'
--      (the People dropdown already offers Lead — saves error today)
--   2. organizations.relationship_status migrates to the shared 9-value
--      relationship canon; existing 'other' rows become 'unknown'
--   3. work_payment_terms enum gains 'net_45' + 'custom'
--   4. client_meetings / meeting_templates meeting_type CHECKs gain
--      'presentation', 'workshop', 'interview' (the Overview tab already
--      offers them — saves violate the CHECK today)
--   5. file_category enum gains the six categories the Files UI already
--      offers (invoice, proposal, reference, media, notes, process)
--
-- Currency canon (lowercase -> uppercase, 5 -> 10 values) is intentionally
-- NOT here: it must land together with the code switch (Phase 3.3), or the
-- interim mixed-case state breaks billing writes.
-- ============================================================================

-- Drop every CHECK constraint that references a given column, regardless of
-- name — this repo has been bitten twice by constraints keeping stale names
-- after renames (see project memory: supabase-environments).
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

-- ============================================================================
-- 1. PEOPLE RELATIONSHIP CANON
-- ============================================================================

SELECT pg_temp.drop_column_checks('public.people', 'relationship_type');

ALTER TABLE public.people
  ADD CONSTRAINT people_relationship_type_check CHECK (
    relationship_type IS NULL OR relationship_type IN (
      'client', 'prospect', 'lead', 'past_client',
      'team', 'partner', 'vendor', 'personal', 'unknown'
    )
  );

-- ============================================================================
-- 2. ORGANIZATIONS RELATIONSHIP CANON
-- ============================================================================

-- Normalize out-of-canon values before tightening the constraint.
UPDATE public.organizations
SET relationship_status = 'unknown'
WHERE relationship_status IS NOT NULL
  AND relationship_status NOT IN (
    'client', 'prospect', 'lead', 'past_client',
    'team', 'partner', 'vendor', 'personal', 'unknown'
  );

SELECT pg_temp.drop_column_checks('public.organizations', 'relationship_status');

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_relationship_status_check CHECK (
    relationship_status IS NULL OR relationship_status IN (
      'client', 'prospect', 'lead', 'past_client',
      'team', 'partner', 'vendor', 'personal', 'unknown'
    )
  );

ALTER TABLE public.organizations
  ALTER COLUMN relationship_status SET DEFAULT 'unknown';

-- ============================================================================
-- 3. PAYMENT TERMS ENUM
-- ============================================================================

ALTER TYPE public.work_payment_terms ADD VALUE IF NOT EXISTS 'net_45';
ALTER TYPE public.work_payment_terms ADD VALUE IF NOT EXISTS 'custom';

-- ============================================================================
-- 4. MEETING TYPE CANON
-- ============================================================================

SELECT pg_temp.drop_column_checks('public.client_meetings', 'meeting_type');

ALTER TABLE public.client_meetings
  ADD CONSTRAINT valid_meeting_type CHECK (
    meeting_type IS NULL OR meeting_type IN (
      'discovery', 'kickoff', 'check-in', 'review',
      'presentation', 'workshop', 'interview', 'other'
    )
  );

SELECT pg_temp.drop_column_checks('public.meeting_templates', 'meeting_type');

ALTER TABLE public.meeting_templates
  ADD CONSTRAINT valid_template_meeting_type CHECK (
    meeting_type IS NULL OR meeting_type IN (
      'discovery', 'kickoff', 'check-in', 'review',
      'presentation', 'workshop', 'interview', 'other'
    )
  );

-- ============================================================================
-- 5. FILE CATEGORY ENUM
-- ============================================================================

ALTER TYPE public.file_category ADD VALUE IF NOT EXISTS 'invoice';
ALTER TYPE public.file_category ADD VALUE IF NOT EXISTS 'proposal';
ALTER TYPE public.file_category ADD VALUE IF NOT EXISTS 'reference';
ALTER TYPE public.file_category ADD VALUE IF NOT EXISTS 'media';
ALTER TYPE public.file_category ADD VALUE IF NOT EXISTS 'notes';
ALTER TYPE public.file_category ADD VALUE IF NOT EXISTS 'process';

-- ============================================================================
-- DONE: vocab constraints match the field-contract canon
-- ============================================================================

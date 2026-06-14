-- Relax finding_has_target so needs_routing findings can exist before person/org are chosen.
-- Separate migration: enum value from 20260614120000 must be committed first.

ALTER TABLE public.intelligence_findings
  DROP CONSTRAINT IF EXISTS finding_has_target;

ALTER TABLE public.intelligence_findings
  ADD CONSTRAINT finding_has_target CHECK (
    person_id IS NOT NULL
    OR org_id IS NOT NULL
    OR finding_type = 'needs_routing'
  );

-- Allow People records created through Ask Salt's policy-aware memory tools
-- to be distinguished from automated system-play capture.

ALTER TABLE public.people
  DROP CONSTRAINT IF EXISTS people_created_via_check;

ALTER TABLE public.people
  ADD CONSTRAINT people_created_via_check
  CHECK (created_via IN ('manual', 'system_play', 'bootstrap', 'import', 'ask_salt'));

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_created_via_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_created_via_check
  CHECK (created_via IN ('manual', 'system_play', 'bootstrap', 'import', 'ask_salt'));

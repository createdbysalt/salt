-- Add last_contact_at to people table (orgs/clients already has it)

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_people_last_contact
  ON public.people(workspace_id, last_contact_at)
  WHERE last_contact_at IS NOT NULL;

COMMENT ON COLUMN public.people.last_contact_at IS 'Last contact date with this person (manually set or auto-updated from meetings/emails)';

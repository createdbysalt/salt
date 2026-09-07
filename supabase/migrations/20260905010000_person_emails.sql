-- person_emails: multi-email identity for people
--
-- A person can be reached at several addresses (work + personal, aliases,
-- address changes). Today every lookup keys on people.email alone, so the
-- same human at a second address births a duplicate record. This table is
-- the identity set; people.email stays as the denormalized primary for
-- backward compatibility and is kept in sync with the primary row here.
--
-- Invariants:
--   - (workspace_id, email) is unique — an address belongs to one person.
--   - Exactly one primary per person, enforced by the partial unique index
--     (at most one) plus writers that always seed a primary on create.
--   - source: capture = seen in a capture envelope; manual = user-entered;
--     merge = inherited from a merged-away duplicate; backfill = this
--     migration's seed from people.email.

CREATE TABLE public.person_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'capture'
    CHECK (source IN ('capture', 'manual', 'merge', 'backfill')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- An address resolves to exactly one person per workspace.
CREATE UNIQUE INDEX idx_person_emails_workspace_email
  ON public.person_emails(workspace_id, email);

-- At most one primary per person.
CREATE UNIQUE INDEX idx_person_emails_one_primary
  ON public.person_emails(person_id)
  WHERE is_primary;

CREATE INDEX idx_person_emails_person
  ON public.person_emails(person_id);

CREATE INDEX idx_person_emails_workspace
  ON public.person_emails(workspace_id);

ALTER TABLE public.person_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view person emails"
  ON public.person_emails FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage person emails"
  ON public.person_emails FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Explicit GRANTs — RLS alone is not enough on environments without
-- default-privilege coverage (the 42501 class; see connector_rules).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_emails TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_emails TO authenticated;

DO $$
BEGIN
  IF NOT has_table_privilege('service_role', 'public.person_emails', 'SELECT') THEN
    RAISE EXCEPTION 'service_role still lacks SELECT on person_emails';
  END IF;
END $$;

-- Backfill: every existing people.email becomes the primary row.
-- Emails are stored lowercased to match the resolver's normalization.
INSERT INTO public.person_emails (workspace_id, person_id, email, is_primary, source)
SELECT p.workspace_id, p.id, lower(trim(p.email)), TRUE, 'backfill'
FROM public.people p
WHERE p.email IS NOT NULL
  AND btrim(p.email) <> ''
  AND p.deleted_at IS NULL
ON CONFLICT (workspace_id, email) DO NOTHING;

COMMENT ON TABLE public.person_emails IS 'All known email addresses for a person; exactly one is primary and mirrored onto people.email';
COMMENT ON COLUMN public.person_emails.is_primary IS 'Primary address — mirrored to people.email; enforced at-most-one per person by idx_person_emails_one_primary';
COMMENT ON COLUMN public.person_emails.source IS 'capture = seen in a capture; manual = user-entered; merge = inherited from a merged duplicate; backfill = seeded from people.email';

-- ============================================================================
-- ARCHIVE vs TRASH: add archived_at to memory entity tables
-- Archive = archived_at set (kept indefinitely, reversible)
-- Trash = deleted_at set (auto-purged after 30 days)
-- projects already has archived_at from 20260216100000_projects_soft_delete_and_timeline.sql
-- ============================================================================

-- People
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_people_archived_at
  ON public.people(studio_id, archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_deleted_at_purge
  ON public.people(deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.people.archived_at IS 'When person was archived. Archived people are hidden from active lists but restorable.';
COMMENT ON COLUMN public.people.deleted_by IS 'User who moved person to trash (audit trail).';

-- Organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_organizations_archived_at
  ON public.organizations(studio_id, archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at_purge
  ON public.organizations(deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.organizations.archived_at IS 'When org was archived. Archived orgs are hidden from active lists but restorable.';
COMMENT ON COLUMN public.organizations.deleted_by IS 'User who moved org to trash (audit trail).';

-- Notes (projects already has archived_at)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_notes_archived_at
  ON public.notes(workspace_id, archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notes_deleted_at_purge
  ON public.notes(deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.notes.archived_at IS 'When note was archived. Archived notes are hidden from active lists but restorable.';
COMMENT ON COLUMN public.notes.deleted_by IS 'User who moved note to trash (audit trail).';

-- ============================================================================
-- FILES + MEETINGS: archive + trash lifecycle (Memory directory parity)
-- files already has archived_at (project_files_archive); add trash columns
-- meetings gets full archive + trash columns
-- ============================================================================

ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_files_deleted_at_purge
  ON public.files(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_active_list
  ON public.files(workspace_id, created_at DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL;

COMMENT ON COLUMN public.files.deleted_at IS 'When file was moved to trash. Permanently deleted after 30 days.';
COMMENT ON COLUMN public.files.deleted_by IS 'User who moved file to trash (audit trail).';

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_meetings_archived_at
  ON public.meetings(workspace_id, archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_deleted_at_purge
  ON public.meetings(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_active_list
  ON public.meetings(workspace_id, start_time DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL;

COMMENT ON COLUMN public.meetings.archived_at IS 'When meeting was archived. Hidden from active lists but restorable.';
COMMENT ON COLUMN public.meetings.deleted_at IS 'When meeting was moved to trash. Permanently deleted after 30 days.';
COMMENT ON COLUMN public.meetings.deleted_by IS 'User who moved meeting to trash (audit trail).';

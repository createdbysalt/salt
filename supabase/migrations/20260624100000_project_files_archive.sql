-- Archive support for Files Memory (reversible; distinct from hard delete)
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_project_files_archived_at
  ON public.project_files(studio_id, archived_at)
  WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN public.project_files.archived_at IS 'When set, file is archived and hidden from the default Files directory';

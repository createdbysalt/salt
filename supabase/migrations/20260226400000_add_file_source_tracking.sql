-- Add source tracking to project_files
-- Tracks where files came from: manual upload, email sent, email received, etc.

-- Add source_type column
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'upload'
    CHECK (source_type IN ('upload', 'email_sent', 'email_received', 'import'));

-- Add reference to source email (for files that came from emails)
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS source_email_id uuid REFERENCES public.client_emails(id) ON DELETE SET NULL;

-- Index for querying files by source
CREATE INDEX IF NOT EXISTS idx_project_files_source_type ON public.project_files(source_type);
CREATE INDEX IF NOT EXISTS idx_project_files_source_email ON public.project_files(source_email_id) WHERE source_email_id IS NOT NULL;

-- Add system tag for email attachments (if not exists)
INSERT INTO public.file_tags (id, label, color, is_system, display_order)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Email Attachment',
  'blue',
  true,
  100
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.project_files.source_type IS 'Where this file originated: upload (manual), email_sent (attachment we sent), email_received (attachment from client), import (bulk import)';
COMMENT ON COLUMN public.project_files.source_email_id IS 'Reference to the email this file was attached to (if source_type is email_sent or email_received)';

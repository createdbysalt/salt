-- ============================================================================
-- ADD LINK SUPPORT TO FILES
-- ============================================================================
-- Allows storing external links (Google Drive, Figma, YouTube, etc.) alongside
-- regular file uploads. Links have no storage footprint but appear in the files list.
-- ============================================================================

-- Add file_type column to distinguish files from links (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'project_files'
    AND column_name = 'file_type'
  ) THEN
    ALTER TABLE public.project_files
    ADD COLUMN file_type text NOT NULL DEFAULT 'file'
    CHECK (file_type IN ('file', 'link'));
  END IF;
END $$;

-- Add external_url column for storing link URLs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'project_files'
    AND column_name = 'external_url'
  ) THEN
    ALTER TABLE public.project_files
    ADD COLUMN external_url text;
  END IF;
END $$;

-- Make object_path nullable for links (links don't have storage objects)
ALTER TABLE public.project_files
ALTER COLUMN object_path DROP NOT NULL;

-- Make size_bytes nullable and remove constraint for links
ALTER TABLE public.project_files
DROP CONSTRAINT IF EXISTS valid_size;

ALTER TABLE public.project_files
ALTER COLUMN size_bytes DROP NOT NULL;

-- Drop existing constraint if it exists, then add new one
ALTER TABLE public.project_files
DROP CONSTRAINT IF EXISTS valid_file_data;

-- Add new constraint that allows 0 or null for links
ALTER TABLE public.project_files
ADD CONSTRAINT valid_file_data CHECK (
  (file_type = 'file' AND object_path IS NOT NULL AND size_bytes > 0 AND size_bytes <= 52428800)
  OR
  (file_type = 'link' AND external_url IS NOT NULL)
);

-- Add index for file_type for filtering (idempotent)
CREATE INDEX IF NOT EXISTS idx_project_files_file_type ON public.project_files(file_type);

-- Comments
COMMENT ON COLUMN public.project_files.file_type IS 'Type of file entry: file (uploaded) or link (external URL)';
COMMENT ON COLUMN public.project_files.external_url IS 'External URL for link type files (Google Drive, Figma, YouTube, etc.)';

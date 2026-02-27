-- ============================================================================
-- AI FILE SUMMARY COLUMNS + MARKDOWN MIME TYPE
-- ============================================================================
-- 1. Adds text/markdown to allowed MIME types for bridge-files bucket
-- 2. Adds columns for AI-powered file summarization:
--    - ai_status: Track processing state
--    - ai_summary: The generated summary text
--    - ai_extracted_at: When the summary was generated
--    - ai_error: Error message if generation failed
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Add text/markdown to allowed MIME types
-- ----------------------------------------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'text/markdown')
WHERE id = 'bridge-files'
  AND NOT ('text/markdown' = ANY(allowed_mime_types));

-- ----------------------------------------------------------------------------
-- 1. Create AI status enum
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE file_ai_status AS ENUM (
    'pending',      -- File uploaded, not yet processed
    'processing',   -- AI is currently analyzing the file
    'completed',    -- Summary generated successfully
    'failed',       -- Processing failed (see ai_error)
    'unsupported'   -- File type not supported for AI summary
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Add AI columns to project_files
-- ----------------------------------------------------------------------------

-- AI processing status
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS ai_status file_ai_status DEFAULT 'pending';

-- Generated summary text
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS ai_summary text;

-- When summary was extracted
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS ai_extracted_at timestamptz;

-- Error message if AI processing failed
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS ai_error text;

-- ----------------------------------------------------------------------------
-- 3. Add indexes for AI status queries
-- ----------------------------------------------------------------------------

-- Index for finding files needing processing
CREATE INDEX IF NOT EXISTS idx_project_files_ai_status
  ON public.project_files(ai_status)
  WHERE ai_status IN ('pending', 'processing');

-- Index for completed summaries
CREATE INDEX IF NOT EXISTS idx_project_files_ai_completed
  ON public.project_files(ai_extracted_at DESC)
  WHERE ai_status = 'completed';

-- ----------------------------------------------------------------------------
-- 4. Comments
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.project_files.ai_status IS 'AI summary processing status: pending, processing, completed, failed, unsupported';
COMMENT ON COLUMN public.project_files.ai_summary IS 'AI-generated summary of file contents (2-3 sentences)';
COMMENT ON COLUMN public.project_files.ai_extracted_at IS 'Timestamp when AI summary was generated';
COMMENT ON COLUMN public.project_files.ai_error IS 'Error message if AI processing failed';

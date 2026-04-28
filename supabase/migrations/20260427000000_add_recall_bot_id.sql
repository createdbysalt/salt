-- ============================================================================
-- ADD: recall_bot_id column to client_meetings
-- ============================================================================
-- Supports Recall.ai integration for meeting transcription.
-- Replaces Fireflies.ai as our transcription provider.
-- ============================================================================

-- Add Recall.ai bot ID column
ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS recall_bot_id text;

-- Create index for Recall.ai webhook lookups
CREATE INDEX IF NOT EXISTS idx_client_meetings_recall_bot
  ON public.client_meetings(recall_bot_id)
  WHERE recall_bot_id IS NOT NULL;

-- Add documentation
COMMENT ON COLUMN public.client_meetings.recall_bot_id IS 'Recall.ai bot ID for meeting transcription';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

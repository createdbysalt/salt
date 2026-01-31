-- ============================================================================
-- EXTEND: client_meetings with transcription columns
-- ============================================================================
-- Adds Cal.com and Fireflies.ai integration columns for meeting transcription.
-- Uses IF NOT EXISTS to ensure idempotency.
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD CAL.COM INTEGRATION COLUMNS
-- ============================================================================

-- Cal.com booking ID
ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS cal_booking_id text;

-- Cal.com event UID
ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS cal_event_uid text;

-- ============================================================================
-- STEP 2: ADD FIREFLIES.AI INTEGRATION COLUMNS
-- ============================================================================

-- Fireflies meeting ID
ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS fireflies_meeting_id text;

-- ============================================================================
-- STEP 3: ADD TRANSCRIPTION COLUMNS
-- ============================================================================

-- Transcript status
ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS transcript_status text DEFAULT 'none';

-- Full transcript content
ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS transcript_content text;

-- AI-generated summary
ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS transcript_summary text;

-- Action items extracted from transcript
ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS transcript_action_items jsonb DEFAULT '[]'::jsonb;
-- Structure: [{ text, assignee, due_date, completed }]

-- ============================================================================
-- STEP 4: ADD RECORDING COLUMNS
-- ============================================================================

-- URL to the meeting recording
ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS recording_url text;

-- Whether recording consent was obtained
ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS recording_consent boolean;

-- ============================================================================
-- STEP 5: ADD TRANSCRIPT STATUS CONSTRAINT
-- ============================================================================

-- Add check constraint for transcript_status
ALTER TABLE public.client_meetings
DROP CONSTRAINT IF EXISTS valid_transcript_status;

ALTER TABLE public.client_meetings
ADD CONSTRAINT valid_transcript_status CHECK (
  transcript_status IN ('none', 'recording', 'processing', 'completed', 'failed')
);

-- ============================================================================
-- STEP 6: CREATE INDEXES FOR EXTERNAL ID LOOKUPS
-- ============================================================================

-- Index on cal_booking_id for Cal.com webhook lookups
CREATE INDEX IF NOT EXISTS idx_client_meetings_cal_booking
  ON public.client_meetings(cal_booking_id)
  WHERE cal_booking_id IS NOT NULL;

-- Index on fireflies_meeting_id for Fireflies webhook lookups
CREATE INDEX IF NOT EXISTS idx_client_meetings_fireflies
  ON public.client_meetings(fireflies_meeting_id)
  WHERE fireflies_meeting_id IS NOT NULL;

-- Index for finding meetings needing transcription processing
CREATE INDEX IF NOT EXISTS idx_client_meetings_transcript_status
  ON public.client_meetings(transcript_status)
  WHERE transcript_status IN ('recording', 'processing');

-- ============================================================================
-- STEP 7: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.client_meetings.cal_booking_id IS 'Cal.com booking ID for scheduled meetings';
COMMENT ON COLUMN public.client_meetings.cal_event_uid IS 'Cal.com event UID for calendar sync';
COMMENT ON COLUMN public.client_meetings.fireflies_meeting_id IS 'Fireflies.ai meeting ID for transcription';
COMMENT ON COLUMN public.client_meetings.transcript_status IS 'Transcription status: none, recording, processing, completed, failed';
COMMENT ON COLUMN public.client_meetings.transcript_content IS 'Full meeting transcript text';
COMMENT ON COLUMN public.client_meetings.transcript_summary IS 'AI-generated meeting summary';
COMMENT ON COLUMN public.client_meetings.transcript_action_items IS 'Action items: [{ text, assignee, due_date, completed }]';
COMMENT ON COLUMN public.client_meetings.recording_url IS 'URL to the meeting recording (if available)';
COMMENT ON COLUMN public.client_meetings.recording_consent IS 'Whether participants consented to recording';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary of changes:
-- [check] Added cal_booking_id and cal_event_uid for Cal.com integration
-- [check] Added fireflies_meeting_id for Fireflies.ai integration
-- [check] Added transcript_status, transcript_content, transcript_summary, transcript_action_items
-- [check] Added recording_url and recording_consent columns
-- [check] Added transcript_status CHECK constraint
-- [check] Added indexes for external ID lookups
--
-- ============================================================================

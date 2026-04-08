-- ============================================================================
-- ADD: cal_synced_at timestamp for tracking Cal.com sync status
-- ============================================================================
-- Tracks when each meeting type was last synced to Cal.com.
-- Null means never synced, populated means synced at that timestamp.
-- ============================================================================

ALTER TABLE public.meeting_types
ADD COLUMN cal_synced_at timestamptz;

COMMENT ON COLUMN public.meeting_types.cal_synced_at IS 'Timestamp of last successful sync to Cal.com (null = never synced)';

-- Create index for finding unsynced meeting types
CREATE INDEX idx_meeting_types_unsynced ON public.meeting_types(studio_id)
WHERE cal_event_type_id IS NOT NULL AND cal_synced_at IS NULL;

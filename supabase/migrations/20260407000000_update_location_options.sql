-- Migration: Update location options to match Cal.com UI
--
-- Changes 'custom' to 'link' to match Cal.com's "Link meeting" option
-- =============================================================================

-- Drop the existing constraint
ALTER TABLE public.meeting_types
DROP CONSTRAINT IF EXISTS valid_location;

-- Add the updated constraint
ALTER TABLE public.meeting_types
ADD CONSTRAINT valid_location CHECK (location IN ('cal_video', 'google_meet', 'zoom', 'phone', 'in_person', 'link'));

-- Migrate any existing 'custom' values to 'link'
UPDATE public.meeting_types
SET location = 'link'
WHERE location = 'custom';

-- Update comment
COMMENT ON COLUMN public.meeting_types.location IS 'Meeting location: cal_video (default), google_meet, zoom, phone, in_person, link';

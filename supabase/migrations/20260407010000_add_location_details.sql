-- Migration: Add location detail fields to meeting_types
--
-- Adds fields for location-specific details:
-- - location_phone: Phone number for phone call meetings
-- - location_address: Address for in-person meetings
-- - location_link: URL for link meetings
-- =============================================================================

ALTER TABLE public.meeting_types
ADD COLUMN IF NOT EXISTS location_phone text,
ADD COLUMN IF NOT EXISTS location_address text,
ADD COLUMN IF NOT EXISTS location_link text;

-- Add comments
COMMENT ON COLUMN public.meeting_types.location_phone IS 'Phone number for phone call location type';
COMMENT ON COLUMN public.meeting_types.location_address IS 'Address for in-person location type';
COMMENT ON COLUMN public.meeting_types.location_link IS 'URL for link meeting location type';

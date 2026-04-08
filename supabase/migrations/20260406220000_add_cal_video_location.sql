-- Migration: Add cal_video location option to meeting_types
--
-- Adds Cal Video as a location option and makes it the default.
-- Cal Video is Cal.com's built-in video conferencing (always available).
-- =============================================================================

-- Drop the existing constraint
ALTER TABLE public.meeting_types
DROP CONSTRAINT IF EXISTS valid_location;

-- Add the new constraint with all location options
ALTER TABLE public.meeting_types
ADD CONSTRAINT valid_location CHECK (location IN ('cal_video', 'google_meet', 'zoom', 'phone', 'in_person', 'link'));

-- Change the default to cal_video
ALTER TABLE public.meeting_types
ALTER COLUMN location SET DEFAULT 'cal_video';

-- Update existing meeting types that have zoom as location to cal_video
-- (only if they haven't been synced to Cal.com yet, to avoid breaking existing synced types)
UPDATE public.meeting_types
SET location = 'cal_video'
WHERE location = 'zoom' AND cal_event_type_id IS NULL;

-- Update the seed function to use cal_video as default location
CREATE OR REPLACE FUNCTION public.seed_default_meeting_types(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.meeting_types (
    studio_id, name, slug, duration_minutes, description, sort_order, is_active,
    booking_questions, buffer_minutes, min_notice_hours, location
  ) VALUES
    -- Quick Call (15 min)
    (
      p_studio_id,
      'Quick Call',
      'quick-call',
      15,
      'A brief call for quick questions or updates.',
      1,
      true,
      '[]'::jsonb,
      5,
      2,
      'cal_video'
    ),
    -- Discovery Call (30 min)
    (
      p_studio_id,
      'Discovery Call',
      'discovery-call',
      30,
      'An introductory call to discuss your project needs and see if we''re a good fit.',
      2,
      true,
      '[{"id": "project_type", "type": "select", "label": "What type of project are you planning?", "required": true, "options": ["Website", "Web App", "Mobile App", "Branding", "Other"]}, {"id": "timeline", "type": "select", "label": "What is your timeline?", "required": true, "options": ["ASAP", "1-2 months", "3-6 months", "6+ months", "Flexible"]}]'::jsonb,
      10,
      24,
      'cal_video'
    ),
    -- Project Kickoff (60 min)
    (
      p_studio_id,
      'Project Kickoff',
      'project-kickoff',
      60,
      'Initial meeting to align on project goals, scope, and next steps.',
      3,
      true,
      '[{"id": "project_brief", "type": "textarea", "label": "Please share any project documents or briefs", "required": false, "placeholder": "Links to documents, briefs, or any relevant materials..."}]'::jsonb,
      15,
      48,
      'cal_video'
    ),
    -- Strategy Session (90 min)
    (
      p_studio_id,
      'Strategy Session',
      'strategy-session',
      90,
      'Deep dive into strategy, planning, and roadmapping.',
      4,
      true,
      '[{"id": "goals", "type": "textarea", "label": "What are your main goals for this session?", "required": true, "placeholder": "What do you hope to achieve?"}]'::jsonb,
      15,
      72,
      'cal_video'
    )
  ON CONFLICT (studio_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    duration_minutes = EXCLUDED.duration_minutes,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    booking_questions = EXCLUDED.booking_questions,
    buffer_minutes = EXCLUDED.buffer_minutes,
    min_notice_hours = EXCLUDED.min_notice_hours,
    location = EXCLUDED.location;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for location options
COMMENT ON COLUMN public.meeting_types.location IS 'Meeting location: cal_video (default), google_meet, zoom, phone, in_person, link';

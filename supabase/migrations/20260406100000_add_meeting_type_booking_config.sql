-- ============================================================================
-- Migration: Add booking configuration to meeting_types
-- ============================================================================
-- Adds booking questions, buffer time, minimum notice, and other Cal.com
-- settings to meeting_types for sync with Cal.com event types.
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD COLUMNS
-- ============================================================================

ALTER TABLE public.meeting_types
ADD COLUMN IF NOT EXISTS booking_questions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS buffer_minutes int DEFAULT 15,
ADD COLUMN IF NOT EXISTS min_notice_hours int DEFAULT 24,
ADD COLUMN IF NOT EXISTS location text DEFAULT 'zoom',
ADD COLUMN IF NOT EXISTS requires_confirmation boolean DEFAULT false;

-- ============================================================================
-- STEP 2: ADD CONSTRAINTS
-- ============================================================================

ALTER TABLE public.meeting_types
ADD CONSTRAINT valid_buffer CHECK (buffer_minutes >= 0 AND buffer_minutes <= 120),
ADD CONSTRAINT valid_min_notice CHECK (min_notice_hours >= 0 AND min_notice_hours <= 168),
ADD CONSTRAINT valid_location CHECK (location IN ('zoom', 'google_meet', 'phone', 'in_person', 'custom'));

-- ============================================================================
-- STEP 3: UPDATE DEFAULT MEETING TYPES WITH BOOKING QUESTIONS
-- ============================================================================

-- Discovery: Full booking questions for lead qualification
-- Order: Easy warm-up → Context → Vision → Qualifying (budget last)
UPDATE public.meeting_types
SET booking_questions = '[
  {
    "id": "website",
    "type": "url",
    "label": "Your website",
    "required": false,
    "placeholder": "https://yourcompany.com"
  },
  {
    "id": "referral_source",
    "type": "select",
    "label": "How did you hear about us?",
    "required": true,
    "options": [
      "Google search",
      "Referral from a friend/colleague",
      "Social media (Instagram, LinkedIn, X)",
      "Saw your portfolio/work",
      "Clutch/Dribbble/Awwwards",
      "Podcast/Blog",
      "Other"
    ]
  },
  {
    "id": "industry",
    "type": "text",
    "label": "What industry are you in?",
    "required": true,
    "placeholder": "e.g., B2B SaaS, E-commerce, Healthcare"
  },
  {
    "id": "project_type",
    "type": "multiselect",
    "label": "What type of project are you looking for?",
    "required": true,
    "options": [
      "Website design",
      "Website development",
      "Branding/Identity",
      "Mobile app",
      "Web app",
      "Marketing/Ads",
      "Content/Copywriting",
      "UI/UX audit",
      "Ongoing retainer",
      "Other"
    ]
  },
  {
    "id": "primary_goal",
    "type": "textarea",
    "label": "What is the primary goal for this project?",
    "required": true,
    "placeholder": "Tell us what you are hoping to achieve..."
  },
  {
    "id": "timeline",
    "type": "select",
    "label": "What is your timeline?",
    "required": true,
    "options": [
      "ASAP (within 2 weeks)",
      "1-2 months",
      "3-6 months",
      "6+ months",
      "Flexible/No rush"
    ]
  },
  {
    "id": "budget",
    "type": "select",
    "label": "What is your budget range?",
    "required": true,
    "options": [
      "Under $5,000",
      "$5,000 - $10,000",
      "$10,000 - $25,000",
      "$25,000 - $50,000",
      "$50,000+",
      "Not sure yet"
    ]
  }
]'::jsonb,
buffer_minutes = 15,
min_notice_hours = 24
WHERE slug = 'discovery';

-- Kickoff: Lighter questions (already qualified)
UPDATE public.meeting_types
SET booking_questions = '[
  {
    "id": "agenda",
    "type": "textarea",
    "label": "Anything specific you want to cover?",
    "required": false,
    "placeholder": "Topics, questions, or materials to prepare..."
  }
]'::jsonb,
buffer_minutes = 15,
min_notice_hours = 48
WHERE slug = 'kickoff';

-- Check-in: Minimal questions
UPDATE public.meeting_types
SET booking_questions = '[
  {
    "id": "agenda",
    "type": "textarea",
    "label": "What would you like to discuss?",
    "required": false,
    "placeholder": "Quick agenda or topics..."
  }
]'::jsonb,
buffer_minutes = 10,
min_notice_hours = 24
WHERE slug = 'check-in';

-- Presentation: Minimal questions
UPDATE public.meeting_types
SET booking_questions = '[
  {
    "id": "attendees",
    "type": "text",
    "label": "Who else will be attending?",
    "required": false,
    "placeholder": "Names and roles of other attendees"
  }
]'::jsonb,
buffer_minutes = 15,
min_notice_hours = 48
WHERE slug = 'presentation';

-- ============================================================================
-- STEP 4: UPDATE SEED FUNCTION FOR NEW STUDIOS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_meeting_types(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.meeting_types (
    studio_id, name, slug, duration_minutes, description, sort_order,
    booking_questions, buffer_minutes, min_notice_hours, location
  )
  VALUES
    (
      p_studio_id,
      'Discovery',
      'discovery',
      45,
      'Initial call to understand project needs and goals',
      1,
      '[
        {"id": "website", "type": "url", "label": "Your website", "required": false, "placeholder": "https://yourcompany.com"},
        {"id": "referral_source", "type": "select", "label": "How did you hear about us?", "required": true, "options": ["Google search", "Referral from a friend/colleague", "Social media (Instagram, LinkedIn, X)", "Saw your portfolio/work", "Clutch/Dribbble/Awwwards", "Podcast/Blog", "Other"]},
        {"id": "industry", "type": "text", "label": "What industry are you in?", "required": true, "placeholder": "e.g., B2B SaaS, E-commerce, Healthcare"},
        {"id": "project_type", "type": "multiselect", "label": "What type of project are you looking for?", "required": true, "options": ["Website design", "Website development", "Branding/Identity", "Mobile app", "Web app", "Marketing/Ads", "Content/Copywriting", "UI/UX audit", "Ongoing retainer", "Other"]},
        {"id": "primary_goal", "type": "textarea", "label": "What is the primary goal for this project?", "required": true, "placeholder": "Tell us what you are hoping to achieve..."},
        {"id": "timeline", "type": "select", "label": "What is your timeline?", "required": true, "options": ["ASAP (within 2 weeks)", "1-2 months", "3-6 months", "6+ months", "Flexible/No rush"]},
        {"id": "budget", "type": "select", "label": "What is your budget range?", "required": true, "options": ["Under $5,000", "$5,000 - $10,000", "$10,000 - $25,000", "$25,000 - $50,000", "$50,000+", "Not sure yet"]}
      ]'::jsonb,
      15,
      24,
      'zoom'
    ),
    (
      p_studio_id,
      'Kickoff',
      'kickoff',
      60,
      'Project start meeting to align on scope and timeline',
      2,
      '[{"id": "agenda", "type": "textarea", "label": "Anything specific you want to cover?", "required": false, "placeholder": "Topics, questions, or materials to prepare..."}]'::jsonb,
      15,
      48,
      'zoom'
    ),
    (
      p_studio_id,
      'Check-in',
      'check-in',
      30,
      'Regular progress update and feedback session',
      3,
      '[{"id": "agenda", "type": "textarea", "label": "What would you like to discuss?", "required": false, "placeholder": "Quick agenda or topics..."}]'::jsonb,
      10,
      24,
      'zoom'
    ),
    (
      p_studio_id,
      'Presentation',
      'presentation',
      45,
      'Deliverable review and approval meeting',
      4,
      '[{"id": "attendees", "type": "text", "label": "Who else will be attending?", "required": false, "placeholder": "Names and roles of other attendees"}]'::jsonb,
      15,
      48,
      'zoom'
    )
  ON CONFLICT (studio_id, slug) DO UPDATE SET
    booking_questions = EXCLUDED.booking_questions,
    buffer_minutes = EXCLUDED.buffer_minutes,
    min_notice_hours = EXCLUDED.min_notice_hours,
    location = EXCLUDED.location;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- STEP 5: ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.meeting_types.booking_questions IS 'JSON array of booking questions to ask when scheduling (syncs to Cal.com)';
COMMENT ON COLUMN public.meeting_types.buffer_minutes IS 'Buffer time in minutes before/after meetings';
COMMENT ON COLUMN public.meeting_types.min_notice_hours IS 'Minimum hours notice required to book';
COMMENT ON COLUMN public.meeting_types.location IS 'Meeting location: zoom, google_meet, phone, in_person, custom';
COMMENT ON COLUMN public.meeting_types.requires_confirmation IS 'Whether bookings require manual confirmation';

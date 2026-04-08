-- ============================================================================
-- Migration: Add pricing and expand default meeting types
-- ============================================================================
-- Adds price_cents for paid meetings (consultations) and expands the default
-- meeting type templates with better questions.
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD PRICING COLUMNS
-- ============================================================================

ALTER TABLE public.meeting_types
ADD COLUMN IF NOT EXISTS price_cents int DEFAULT NULL,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'usd';

-- Add constraint for currency
ALTER TABLE public.meeting_types
ADD CONSTRAINT valid_currency CHECK (currency IN ('usd', 'eur', 'gbp', 'cad', 'aud'));

COMMENT ON COLUMN public.meeting_types.price_cents IS 'Price in cents (null = free). Collected via Stripe at booking.';
COMMENT ON COLUMN public.meeting_types.currency IS 'Currency code for pricing';

-- ============================================================================
-- STEP 2: UPDATE EXISTING MEETING TYPES WITH BETTER QUESTIONS
-- ============================================================================

-- Kickoff: Focus on stakeholders, prep, and communication
UPDATE public.meeting_types
SET booking_questions = '[
  {
    "id": "attendees",
    "type": "text",
    "label": "Who else should attend?",
    "required": false,
    "placeholder": "Names and roles of stakeholders"
  },
  {
    "id": "materials",
    "type": "textarea",
    "label": "Any materials or assets to share beforehand?",
    "required": false,
    "placeholder": "Brand guidelines, logins, existing content, etc."
  },
  {
    "id": "communication",
    "type": "select",
    "label": "Preferred communication style",
    "required": true,
    "options": [
      "Slack/Teams (real-time)",
      "Email (async)",
      "Weekly check-ins only",
      "As needed"
    ]
  },
  {
    "id": "priorities",
    "type": "textarea",
    "label": "Any specific concerns or priorities?",
    "required": false,
    "placeholder": "Timeline constraints, must-haves, etc."
  }
]'::jsonb,
buffer_minutes = 15,
min_notice_hours = 48
WHERE slug = 'kickoff';

-- Check-in: Keep it light and focused
UPDATE public.meeting_types
SET booking_questions = '[
  {
    "id": "agenda",
    "type": "textarea",
    "label": "What would you like to discuss?",
    "required": false,
    "placeholder": "Topics, questions, or feedback to cover"
  },
  {
    "id": "blockers",
    "type": "select",
    "label": "Any blockers or urgent items?",
    "required": true,
    "options": [
      "No, just a regular check-in",
      "Yes, need to discuss a blocker",
      "Yes, timeline/scope change needed"
    ]
  }
]'::jsonb,
buffer_minutes = 10,
min_notice_hours = 24
WHERE slug = 'check-in';

-- Presentation: Focus on stakeholders and feedback areas
UPDATE public.meeting_types
SET booking_questions = '[
  {
    "id": "attendees",
    "type": "text",
    "label": "Who else will be attending?",
    "required": false,
    "placeholder": "Names and roles (especially decision makers)"
  },
  {
    "id": "deliverable",
    "type": "select",
    "label": "What are we reviewing?",
    "required": true,
    "options": [
      "Initial concepts/mood boards",
      "First draft/wireframes",
      "Revised designs",
      "Final deliverables",
      "Development preview",
      "Other"
    ]
  },
  {
    "id": "focus_areas",
    "type": "multiselect",
    "label": "What should we focus feedback on?",
    "required": false,
    "options": [
      "Overall direction",
      "Visual design",
      "Copy/messaging",
      "Functionality",
      "Mobile experience",
      "Anything and everything"
    ]
  }
]'::jsonb,
buffer_minutes = 15,
min_notice_hours = 48
WHERE slug = 'presentation';

-- ============================================================================
-- STEP 3: ADD NEW MEETING TYPES (only if they don't exist)
-- ============================================================================

-- Quick Call (15 min) - Urgent/quick questions
INSERT INTO public.meeting_types (
  studio_id, name, slug, duration_minutes, description, sort_order,
  booking_questions, buffer_minutes, min_notice_hours, location
)
SELECT
  studio_id,
  'Quick Call',
  'quick-call',
  15,
  'Quick questions or urgent clarifications',
  5,
  '[
    {
      "id": "topic",
      "type": "text",
      "label": "What do you need to discuss?",
      "required": true,
      "placeholder": "Brief description of the topic"
    }
  ]'::jsonb,
  5,
  2,
  'zoom'
FROM public.meeting_types
WHERE slug = 'discovery'
ON CONFLICT (studio_id, slug) DO NOTHING;

-- Strategy Session (90 min) - Deep dive
INSERT INTO public.meeting_types (
  studio_id, name, slug, duration_minutes, description, sort_order,
  booking_questions, buffer_minutes, min_notice_hours, location
)
SELECT
  studio_id,
  'Strategy Session',
  'strategy',
  90,
  'Deep dive into brand, marketing, or product strategy',
  6,
  '[
    {
      "id": "focus",
      "type": "select",
      "label": "What area should we focus on?",
      "required": true,
      "options": [
        "Brand positioning",
        "Marketing strategy",
        "Product roadmap",
        "Content strategy",
        "Growth / acquisition",
        "General strategy review"
      ]
    },
    {
      "id": "context",
      "type": "textarea",
      "label": "Background context",
      "required": true,
      "placeholder": "Current challenges, goals, what you have tried..."
    },
    {
      "id": "materials",
      "type": "textarea",
      "label": "Materials to review beforehand",
      "required": false,
      "placeholder": "Links to docs, analytics, competitors, etc."
    }
  ]'::jsonb,
  15,
  48,
  'zoom'
FROM public.meeting_types
WHERE slug = 'discovery'
ON CONFLICT (studio_id, slug) DO NOTHING;

-- Consultation (30 min) - Paid consultation
INSERT INTO public.meeting_types (
  studio_id, name, slug, duration_minutes, description, sort_order,
  booking_questions, buffer_minutes, min_notice_hours, location,
  price_cents, currency
)
SELECT
  studio_id,
  'Consultation',
  'consultation',
  30,
  'Paid expert consultation session',
  7,
  '[
    {
      "id": "topic",
      "type": "select",
      "label": "What do you need help with?",
      "required": true,
      "options": [
        "Website/app review",
        "Brand feedback",
        "Marketing advice",
        "Technical guidance",
        "General consultation"
      ]
    },
    {
      "id": "context",
      "type": "textarea",
      "label": "Tell us more about your situation",
      "required": true,
      "placeholder": "What are you working on? What do you hope to get out of this call?"
    },
    {
      "id": "website",
      "type": "url",
      "label": "Your website (if applicable)",
      "required": false,
      "placeholder": "https://yoursite.com"
    }
  ]'::jsonb,
  10,
  24,
  'zoom',
  15000,  -- $150.00 default price
  'usd'
FROM public.meeting_types
WHERE slug = 'discovery'
ON CONFLICT (studio_id, slug) DO NOTHING;

-- Wrap-up (30 min) - Project closeout
INSERT INTO public.meeting_types (
  studio_id, name, slug, duration_minutes, description, sort_order,
  booking_questions, buffer_minutes, min_notice_hours, location
)
SELECT
  studio_id,
  'Wrap-up',
  'wrap-up',
  30,
  'Project closeout and retrospective',
  8,
  '[
    {
      "id": "feedback_areas",
      "type": "multiselect",
      "label": "What would you like to cover?",
      "required": true,
      "options": [
        "Final handoff items",
        "Project retrospective",
        "Future opportunities",
        "Testimonial/case study",
        "Referral discussion"
      ]
    },
    {
      "id": "outstanding",
      "type": "textarea",
      "label": "Any outstanding items or questions?",
      "required": false,
      "placeholder": "Loose ends, final requests, etc."
    }
  ]'::jsonb,
  10,
  24,
  'zoom'
FROM public.meeting_types
WHERE slug = 'discovery'
ON CONFLICT (studio_id, slug) DO NOTHING;

-- ============================================================================
-- STEP 4: UPDATE SEED FUNCTION FOR NEW STUDIOS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_meeting_types(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.meeting_types (
    studio_id, name, slug, duration_minutes, description, sort_order,
    booking_questions, buffer_minutes, min_notice_hours, location, price_cents, currency
  )
  VALUES
    -- Discovery (45 min) - Lead qualification
    (
      p_studio_id, 'Discovery', 'discovery', 45,
      'Initial call to understand project needs and goals', 1,
      '[
        {"id": "website", "type": "url", "label": "Your website", "required": false, "placeholder": "https://yourcompany.com"},
        {"id": "referral_source", "type": "select", "label": "How did you hear about us?", "required": true, "options": ["Google search", "Referral from a friend/colleague", "Social media (Instagram, LinkedIn, X)", "Saw your portfolio/work", "Clutch/Dribbble/Awwwards", "Podcast/Blog", "Other"]},
        {"id": "industry", "type": "text", "label": "What industry are you in?", "required": true, "placeholder": "e.g., B2B SaaS, E-commerce, Healthcare"},
        {"id": "project_type", "type": "multiselect", "label": "What type of project are you looking for?", "required": true, "options": ["Website design", "Website development", "Branding/Identity", "Mobile app", "Web app", "Marketing/Ads", "Content/Copywriting", "UI/UX audit", "Ongoing retainer", "Other"]},
        {"id": "primary_goal", "type": "textarea", "label": "What is the primary goal for this project?", "required": true, "placeholder": "Tell us what you are hoping to achieve..."},
        {"id": "timeline", "type": "select", "label": "What is your timeline?", "required": true, "options": ["ASAP (within 2 weeks)", "1-2 months", "3-6 months", "6+ months", "Flexible/No rush"]},
        {"id": "budget", "type": "select", "label": "What is your budget range?", "required": true, "options": ["Under $5,000", "$5,000 - $10,000", "$10,000 - $25,000", "$25,000 - $50,000", "$50,000+", "Not sure yet"]}
      ]'::jsonb,
      15, 24, 'zoom', NULL, 'usd'
    ),
    -- Kickoff (60 min) - Project start
    (
      p_studio_id, 'Kickoff', 'kickoff', 60,
      'Project start meeting to align on scope and timeline', 2,
      '[
        {"id": "attendees", "type": "text", "label": "Who else should attend?", "required": false, "placeholder": "Names and roles of stakeholders"},
        {"id": "materials", "type": "textarea", "label": "Any materials or assets to share beforehand?", "required": false, "placeholder": "Brand guidelines, logins, existing content, etc."},
        {"id": "communication", "type": "select", "label": "Preferred communication style", "required": true, "options": ["Slack/Teams (real-time)", "Email (async)", "Weekly check-ins only", "As needed"]},
        {"id": "priorities", "type": "textarea", "label": "Any specific concerns or priorities?", "required": false, "placeholder": "Timeline constraints, must-haves, etc."}
      ]'::jsonb,
      15, 48, 'zoom', NULL, 'usd'
    ),
    -- Check-in (30 min) - Progress update
    (
      p_studio_id, 'Check-in', 'check-in', 30,
      'Regular progress update and feedback session', 3,
      '[
        {"id": "agenda", "type": "textarea", "label": "What would you like to discuss?", "required": false, "placeholder": "Topics, questions, or feedback to cover"},
        {"id": "blockers", "type": "select", "label": "Any blockers or urgent items?", "required": true, "options": ["No, just a regular check-in", "Yes, need to discuss a blocker", "Yes, timeline/scope change needed"]}
      ]'::jsonb,
      10, 24, 'zoom', NULL, 'usd'
    ),
    -- Presentation (45 min) - Deliverable review
    (
      p_studio_id, 'Presentation', 'presentation', 45,
      'Deliverable review and approval meeting', 4,
      '[
        {"id": "attendees", "type": "text", "label": "Who else will be attending?", "required": false, "placeholder": "Names and roles (especially decision makers)"},
        {"id": "deliverable", "type": "select", "label": "What are we reviewing?", "required": true, "options": ["Initial concepts/mood boards", "First draft/wireframes", "Revised designs", "Final deliverables", "Development preview", "Other"]},
        {"id": "focus_areas", "type": "multiselect", "label": "What should we focus feedback on?", "required": false, "options": ["Overall direction", "Visual design", "Copy/messaging", "Functionality", "Mobile experience", "Anything and everything"]}
      ]'::jsonb,
      15, 48, 'zoom', NULL, 'usd'
    ),
    -- Quick Call (15 min) - Urgent/quick
    (
      p_studio_id, 'Quick Call', 'quick-call', 15,
      'Quick questions or urgent clarifications', 5,
      '[
        {"id": "topic", "type": "text", "label": "What do you need to discuss?", "required": true, "placeholder": "Brief description of the topic"}
      ]'::jsonb,
      5, 2, 'zoom', NULL, 'usd'
    ),
    -- Strategy Session (90 min) - Deep dive
    (
      p_studio_id, 'Strategy Session', 'strategy', 90,
      'Deep dive into brand, marketing, or product strategy', 6,
      '[
        {"id": "focus", "type": "select", "label": "What area should we focus on?", "required": true, "options": ["Brand positioning", "Marketing strategy", "Product roadmap", "Content strategy", "Growth / acquisition", "General strategy review"]},
        {"id": "context", "type": "textarea", "label": "Background context", "required": true, "placeholder": "Current challenges, goals, what you have tried..."},
        {"id": "materials", "type": "textarea", "label": "Materials to review beforehand", "required": false, "placeholder": "Links to docs, analytics, competitors, etc."}
      ]'::jsonb,
      15, 48, 'zoom', NULL, 'usd'
    ),
    -- Consultation (30 min) - Paid
    (
      p_studio_id, 'Consultation', 'consultation', 30,
      'Paid expert consultation session', 7,
      '[
        {"id": "topic", "type": "select", "label": "What do you need help with?", "required": true, "options": ["Website/app review", "Brand feedback", "Marketing advice", "Technical guidance", "General consultation"]},
        {"id": "context", "type": "textarea", "label": "Tell us more about your situation", "required": true, "placeholder": "What are you working on? What do you hope to get out of this call?"},
        {"id": "website", "type": "url", "label": "Your website (if applicable)", "required": false, "placeholder": "https://yoursite.com"}
      ]'::jsonb,
      10, 24, 'zoom', 15000, 'usd'
    ),
    -- Wrap-up (30 min) - Project closeout
    (
      p_studio_id, 'Wrap-up', 'wrap-up', 30,
      'Project closeout and retrospective', 8,
      '[
        {"id": "feedback_areas", "type": "multiselect", "label": "What would you like to cover?", "required": true, "options": ["Final handoff items", "Project retrospective", "Future opportunities", "Testimonial/case study", "Referral discussion"]},
        {"id": "outstanding", "type": "textarea", "label": "Any outstanding items or questions?", "required": false, "placeholder": "Loose ends, final requests, etc."}
      ]'::jsonb,
      10, 24, 'zoom', NULL, 'usd'
    )
  ON CONFLICT (studio_id, slug) DO UPDATE SET
    booking_questions = EXCLUDED.booking_questions,
    buffer_minutes = EXCLUDED.buffer_minutes,
    min_notice_hours = EXCLUDED.min_notice_hours,
    location = EXCLUDED.location,
    price_cents = EXCLUDED.price_cents,
    currency = EXCLUDED.currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

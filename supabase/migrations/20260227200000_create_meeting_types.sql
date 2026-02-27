-- ============================================================================
-- CREATE: meeting_types table for studio-configurable meeting types
-- ============================================================================
-- Allows studios to define their meeting types (discovery, kickoff, etc.)
-- These can be added to service packages as included meetings.
-- ============================================================================

CREATE TABLE public.meeting_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Core info
  name text NOT NULL,
  slug text NOT NULL,
  duration_minutes int NOT NULL,
  description text,

  -- Display
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,

  -- Cal.com sync (optional)
  cal_event_type_id text,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  CONSTRAINT unique_meeting_type_slug UNIQUE (studio_id, slug)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_meeting_types_studio ON public.meeting_types(studio_id);
CREATE INDEX idx_meeting_types_studio_active ON public.meeting_types(studio_id) WHERE is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.meeting_types ENABLE ROW LEVEL SECURITY;

-- Studio members can view their studio's meeting types
CREATE POLICY "Studio members can view meeting types"
  ON public.meeting_types FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create meeting types
CREATE POLICY "Studio members can create meeting types"
  ON public.meeting_types FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can update their studio's meeting types
CREATE POLICY "Studio members can update meeting types"
  ON public.meeting_types FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can delete their studio's meeting types
CREATE POLICY "Studio members can delete meeting types"
  ON public.meeting_types FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at on changes
CREATE OR REPLACE FUNCTION public.update_meeting_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meeting_types_updated_at
  BEFORE UPDATE ON public.meeting_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meeting_types_updated_at();

-- Auto-generate slug from name
CREATE OR REPLACE FUNCTION public.generate_meeting_type_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Remove leading/trailing hyphens
    NEW.slug = trim(BOTH '-' FROM NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meeting_types_generate_slug
  BEFORE INSERT OR UPDATE OF name ON public.meeting_types
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_meeting_type_slug();

-- ============================================================================
-- SEED: Default meeting types for new studios
-- ============================================================================

-- Function to seed default meeting types
CREATE OR REPLACE FUNCTION public.seed_default_meeting_types(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.meeting_types (studio_id, name, slug, duration_minutes, description, sort_order)
  VALUES
    (p_studio_id, 'Discovery', 'discovery', 45, 'Initial call to understand project needs and goals', 1),
    (p_studio_id, 'Kickoff', 'kickoff', 60, 'Project start meeting to align on scope and timeline', 2),
    (p_studio_id, 'Check-in', 'check-in', 30, 'Regular progress update and feedback session', 3),
    (p_studio_id, 'Presentation', 'presentation', 45, 'Deliverable review and approval meeting', 4)
  ON CONFLICT (studio_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.meeting_types IS 'Studio-configurable meeting types (discovery, kickoff, etc.) that can be added to service packages';
COMMENT ON COLUMN public.meeting_types.slug IS 'URL-safe identifier, auto-generated from name';
COMMENT ON COLUMN public.meeting_types.cal_event_type_id IS 'Optional Cal.com event type ID for sync';
COMMENT ON COLUMN public.meeting_types.duration_minutes IS 'Default duration in minutes (max 480 = 8 hours)';

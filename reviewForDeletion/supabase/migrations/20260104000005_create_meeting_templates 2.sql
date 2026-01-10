-- ============================================================================
-- CREATE: meeting_templates table for reusable meeting presets
-- ============================================================================
-- Allows users to save commonly used meeting configurations
-- (e.g., "Discovery Call - 60min", "Monthly Check-in - 30min").
-- ============================================================================

-- Create meeting_templates table
CREATE TABLE public.meeting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Template info
  name text NOT NULL,
  duration_minutes integer NOT NULL,
  meeting_type text,
  default_location_type text,
  default_description text,
  visibility_default text DEFAULT 'shared_with_client',
  
  -- Metadata
  is_default boolean DEFAULT false, -- User's default template
  
  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  CONSTRAINT valid_template_meeting_type CHECK (
    meeting_type IS NULL OR
    meeting_type = ANY (ARRAY['discovery'::text, 'check-in'::text, 'review'::text, 'kickoff'::text, 'other'::text])
  ),
  CONSTRAINT valid_template_location_type CHECK (
    default_location_type IS NULL OR
    default_location_type = ANY (ARRAY['google-meet'::text, 'zoom'::text, 'phone'::text, 'in-person'::text, 'custom'::text])
  ),
  CONSTRAINT valid_template_visibility CHECK (
    visibility_default = ANY (ARRAY['internal'::text, 'shared_with_client'::text])
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Lookup by user
CREATE INDEX idx_meeting_templates_user 
  ON public.meeting_templates(user_id);

-- Lookup by studio
CREATE INDEX idx_meeting_templates_studio 
  ON public.meeting_templates(studio_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own templates
CREATE POLICY "Users can manage their own meeting templates"
  ON public.meeting_templates FOR ALL
  USING (user_id = auth.uid());

-- Studio members can view templates from other team members (optional: for sharing)
CREATE POLICY "Studio members can view team templates"
  ON public.meeting_templates FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-set studio_id from studio_members on insert
CREATE OR REPLACE FUNCTION public.set_meeting_template_studio_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get user's primary studio
  SELECT studio_id INTO NEW.studio_id
  FROM public.studio_members
  WHERE user_id = NEW.user_id
  LIMIT 1;
  
  IF NEW.studio_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create meeting template: user % is not a member of any studio', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_meeting_template_studio_id
  BEFORE INSERT ON public.meeting_templates
  FOR EACH ROW
  WHEN (NEW.studio_id IS NULL)
  EXECUTE FUNCTION public.set_meeting_template_studio_id();

-- Ensure only one default template per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_meeting_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset other defaults for this user
    UPDATE public.meeting_templates
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_single_default_meeting_template
  AFTER INSERT OR UPDATE OF is_default ON public.meeting_templates
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_meeting_template();

-- ============================================================================
-- SEED: Common meeting templates (optional system defaults)
-- ============================================================================

-- Note: We'll seed these per-user on first calendar connection or manually.
-- Leaving this commented for now, but can be used in onboarding flows.

-- INSERT INTO public.meeting_templates (user_id, studio_id, name, duration_minutes, meeting_type, default_description, is_default) VALUES
-- (auth.uid(), (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() LIMIT 1), 'Discovery Call', 60, 'discovery', '1. Project overview\n2. Timeline discussion\n3. Budget & pricing\n4. Next steps', false),
-- (auth.uid(), (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() LIMIT 1), 'Monthly Check-in', 30, 'check-in', '1. Progress update\n2. Feedback\n3. Next month planning', false),
-- (auth.uid(), (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() LIMIT 1), 'Project Kickoff', 90, 'kickoff', '1. Introduce team members\n2. Project scope overview\n3. Timeline & milestones\n4. Q&A', false);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.meeting_templates IS 'Reusable meeting templates for quick scheduling (e.g., "Discovery Call - 60min")';
COMMENT ON COLUMN public.meeting_templates.duration_minutes IS 'Default meeting duration in minutes (max 480 = 8 hours)';
COMMENT ON COLUMN public.meeting_templates.visibility_default IS 'Default visibility for meetings created from this template';
COMMENT ON COLUMN public.meeting_templates.is_default IS 'Whether this is the user''s default template (only one per user)';


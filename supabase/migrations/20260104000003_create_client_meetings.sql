-- ============================================================================
-- CREATE: client_meetings table for relationship intelligence
-- ============================================================================
-- Powers /dashboard/meetings and client detail "next meetings" widget.
-- Supports Google Calendar sync with external metadata fields.
-- ============================================================================

-- Create client_meetings table
CREATE TABLE public.client_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Core meeting info
  title text NOT NULL,
  description text,
  meeting_type text,
  
  -- Time (stored as timestamptz for proper timezone handling)
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  
  -- Location
  location_type text,
  meeting_url text,
  
  -- Status & visibility
  status text DEFAULT 'scheduled',
  visibility text DEFAULT 'shared_with_client',
  
  -- Google Calendar sync fields
  external_provider text, -- 'google' for Phase 1
  external_calendar_id text, -- Google calendar ID
  external_event_id text, -- Google event ID (unique per calendar)
  external_etag text, -- For conditional updates
  external_updated_at timestamptz, -- Last update from Google
  origin text, -- 'internal' or 'google'
  
  -- Metadata
  notes text, -- Post-meeting notes
  attendees jsonb DEFAULT '[]'::jsonb, -- Array of {name, role, email}
  
  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_meeting_type CHECK (
    meeting_type = ANY (ARRAY['discovery'::text, 'check-in'::text, 'review'::text, 'kickoff'::text, 'other'::text])
  ),
  CONSTRAINT valid_location_type CHECK (
    location_type = ANY (ARRAY['google-meet'::text, 'zoom'::text, 'phone'::text, 'in-person'::text, 'custom'::text])
  ),
  CONSTRAINT valid_status CHECK (
    status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text, 'no-show'::text])
  ),
  CONSTRAINT valid_visibility CHECK (
    visibility = ANY (ARRAY['internal'::text, 'shared_with_client'::text])
  ),
  CONSTRAINT valid_origin CHECK (
    origin = ANY (ARRAY['internal'::text, 'google'::text])
  ),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Core queries by studio + time range
CREATE INDEX idx_client_meetings_studio_time 
  ON public.client_meetings(studio_id, start_time DESC);

-- Queries by client + time range
CREATE INDEX idx_client_meetings_client_time 
  ON public.client_meetings(client_id, start_time DESC);

-- Queries by project
CREATE INDEX idx_client_meetings_project 
  ON public.client_meetings(project_id) 
  WHERE project_id IS NOT NULL;

-- External sync lookups
CREATE INDEX idx_client_meetings_external_event 
  ON public.client_meetings(external_provider, external_calendar_id, external_event_id) 
  WHERE external_event_id IS NOT NULL;

-- Upcoming meetings widget (studio + active status, filter by date in query)
CREATE INDEX idx_client_meetings_upcoming
  ON public.client_meetings(studio_id, start_time)
  WHERE status NOT IN ('cancelled', 'completed');

-- Client-visible meetings
CREATE INDEX idx_client_meetings_client_visible 
  ON public.client_meetings(client_id, start_time) 
  WHERE visibility = 'shared_with_client';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.client_meetings ENABLE ROW LEVEL SECURITY;

-- Studio members can view all meetings for their studio
CREATE POLICY "Studio members can view their studio meetings"
  ON public.client_meetings FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create meetings for their studio
CREATE POLICY "Studio members can create meetings"
  ON public.client_meetings FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can update their studio meetings
CREATE POLICY "Studio members can update their studio meetings"
  ON public.client_meetings FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can delete their studio meetings
CREATE POLICY "Studio members can delete their studio meetings"
  ON public.client_meetings FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Client users can view meetings for their client (only shared ones, and only if active)
CREATE POLICY "Client users can view their shared meetings"
  ON public.client_meetings FOR SELECT
  USING (
    visibility = 'shared_with_client'
    AND client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at on changes
CREATE OR REPLACE FUNCTION public.update_client_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_meetings_updated_at
  BEFORE UPDATE ON public.client_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_meetings_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.client_meetings IS 'Client meetings for relationship intelligence, supporting manual entry and Google Calendar sync';
COMMENT ON COLUMN public.client_meetings.visibility IS 'Controls whether clients can see this meeting in the Bridge (internal or shared_with_client)';
COMMENT ON COLUMN public.client_meetings.origin IS 'Where the meeting was created: internal (in-app) or google (synced from Google Calendar)';
COMMENT ON COLUMN public.client_meetings.external_event_id IS 'Google Calendar event ID for synced meetings, used for idempotent updates';
COMMENT ON COLUMN public.client_meetings.attendees IS 'JSON array of meeting attendees: [{name, role, email}]';


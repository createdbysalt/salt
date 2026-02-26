-- Add group_id to client_emails for tracking group emails sent from General channel
-- And create client_activity_events for system messages (team member added, etc.)

-- ============================================================================
-- 1. Add group_id to client_emails
-- ============================================================================

ALTER TABLE public.client_emails
ADD COLUMN group_id uuid;

-- Index for efficient group email queries
CREATE INDEX idx_client_emails_group_id ON public.client_emails(group_id) WHERE group_id IS NOT NULL;

COMMENT ON COLUMN public.client_emails.group_id IS 'UUID linking emails sent together as a group (from General channel)';

-- ============================================================================
-- 2. Create client_activity_events table for system messages
-- ============================================================================

CREATE TABLE public.client_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Who triggered the event (null for system events)
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,

  -- Event type and data
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT client_activity_events_type_check CHECK (
    event_type IN (
      'contact_added',
      'contact_removed',
      'contact_invited',
      'contact_joined',
      'contact_access_revoked',
      'file_shared',
      'project_linked',
      'stage_changed'
    )
  )
);

-- Indexes
CREATE INDEX idx_client_activity_events_client_id ON public.client_activity_events(client_id);
CREATE INDEX idx_client_activity_events_studio_id ON public.client_activity_events(studio_id);
CREATE INDEX idx_client_activity_events_created_at ON public.client_activity_events(created_at DESC);

-- RLS
ALTER TABLE public.client_activity_events ENABLE ROW LEVEL SECURITY;

-- Studio members can view activity for their studio's clients
CREATE POLICY "Studio members can view client activity"
  ON public.client_activity_events FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
    )
  );

-- Studio members can create activity events
CREATE POLICY "Studio members can create client activity"
  ON public.client_activity_events FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
    )
  );

-- Enable realtime for activity events
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_activity_events;

COMMENT ON TABLE public.client_activity_events IS 'Tracks activity events in client communications (team changes, file shares, etc.)';

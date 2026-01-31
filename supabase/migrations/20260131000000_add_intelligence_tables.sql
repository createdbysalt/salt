-- ============================================================================
-- Migration: Add Intelligence Tables
-- Description: Creates intelligence_events and intelligence_queue tables for
--              unified intelligence feed, library, and generation queue.
-- ============================================================================

-- ============================================================================
-- Table: intelligence_events
-- Stores all intelligence events (strategic insights, technical alerts, etc.)
-- ============================================================================

CREATE TABLE public.intelligence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,

  -- Event classification
  event_type text NOT NULL CHECK (event_type IN ('strategic', 'technical')),
  category text NOT NULL, -- 'competitor_change', 'seo_alert', 'rank_change', 'content_change', etc.
  urgency text NOT NULL DEFAULT 'medium' CHECK (urgency IN ('critical', 'high', 'medium', 'low')),

  -- Content
  title text NOT NULL,
  summary text NOT NULL,
  details jsonb DEFAULT '{}',
  impact text,
  recommendation text,

  -- Sources
  source text NOT NULL, -- 'lighthouse', 'crux', 'competitor_monitor', 'manual'
  source_url text,
  raw_data jsonb DEFAULT '{}',

  -- Workflow
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'actioned', 'dismissed', 'archived')),
  dismissed_at timestamptz,
  dismissed_by uuid REFERENCES auth.users(id),
  archived_at timestamptz,

  -- Library
  is_saved boolean DEFAULT false,
  saved_at timestamptz,
  tags text[] DEFAULT '{}',

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add comment
COMMENT ON TABLE public.intelligence_events IS 'Unified intelligence events for feed, library, and reporting';

-- Indexes for common query patterns
CREATE INDEX intelligence_events_studio_idx ON intelligence_events(studio_id);
CREATE INDEX intelligence_events_project_idx ON intelligence_events(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX intelligence_events_client_idx ON intelligence_events(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX intelligence_events_status_idx ON intelligence_events(studio_id, status);
CREATE INDEX intelligence_events_type_idx ON intelligence_events(studio_id, event_type);
CREATE INDEX intelligence_events_urgency_idx ON intelligence_events(studio_id, urgency) WHERE urgency IN ('critical', 'high');
CREATE INDEX intelligence_events_saved_idx ON intelligence_events(studio_id, is_saved) WHERE is_saved = true;
CREATE INDEX intelligence_events_created_idx ON intelligence_events(studio_id, created_at DESC);
CREATE INDEX intelligence_events_tags_idx ON intelligence_events USING GIN (tags) WHERE array_length(tags, 1) > 0;

-- Trigger for updated_at
CREATE TRIGGER set_intelligence_events_updated_at
  BEFORE UPDATE ON intelligence_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS Policies for intelligence_events
-- ============================================================================

ALTER TABLE intelligence_events ENABLE ROW LEVEL SECURITY;

-- Studio members can view their studio's intelligence events
CREATE POLICY "Studio members can view intelligence events"
  ON intelligence_events
  FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT sm.studio_id
      FROM studio_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- Studio members can insert intelligence events for their studio
CREATE POLICY "Studio members can create intelligence events"
  ON intelligence_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    studio_id IN (
      SELECT sm.studio_id
      FROM studio_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- Studio members can update their studio's intelligence events
CREATE POLICY "Studio members can update intelligence events"
  ON intelligence_events
  FOR UPDATE
  TO authenticated
  USING (
    studio_id IN (
      SELECT sm.studio_id
      FROM studio_members sm
      WHERE sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    studio_id IN (
      SELECT sm.studio_id
      FROM studio_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- Studio members can delete their studio's intelligence events
CREATE POLICY "Studio members can delete intelligence events"
  ON intelligence_events
  FOR DELETE
  TO authenticated
  USING (
    studio_id IN (
      SELECT sm.studio_id
      FROM studio_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Table: intelligence_queue
-- Stores generation jobs for intelligence (reports, analyses, etc.)
-- ============================================================================

CREATE TABLE public.intelligence_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,

  -- Job info
  job_type text NOT NULL, -- 'competitive_analysis', 'seo_audit', 'content_brief', 'market_research', etc.
  job_config jsonb DEFAULT '{}',

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,

  -- Output
  result_event_id uuid REFERENCES intelligence_events(id) ON DELETE SET NULL,

  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add comment
COMMENT ON TABLE public.intelligence_queue IS 'Queue for intelligence generation jobs (reports, analyses)';

-- Indexes
CREATE INDEX intelligence_queue_studio_idx ON intelligence_queue(studio_id);
CREATE INDEX intelligence_queue_status_idx ON intelligence_queue(studio_id, status);
CREATE INDEX intelligence_queue_created_by_idx ON intelligence_queue(created_by);
CREATE INDEX intelligence_queue_pending_idx ON intelligence_queue(status, created_at) WHERE status IN ('pending', 'running');

-- ============================================================================
-- RLS Policies for intelligence_queue
-- ============================================================================

ALTER TABLE intelligence_queue ENABLE ROW LEVEL SECURITY;

-- Studio members can view their studio's queue
CREATE POLICY "Studio members can view intelligence queue"
  ON intelligence_queue
  FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT sm.studio_id
      FROM studio_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- Studio members can create jobs in their studio's queue
CREATE POLICY "Studio members can create queue jobs"
  ON intelligence_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    studio_id IN (
      SELECT sm.studio_id
      FROM studio_members sm
      WHERE sm.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Studio members can update their studio's queue (for cancellation, progress updates)
CREATE POLICY "Studio members can update queue jobs"
  ON intelligence_queue
  FOR UPDATE
  TO authenticated
  USING (
    studio_id IN (
      SELECT sm.studio_id
      FROM studio_members sm
      WHERE sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    studio_id IN (
      SELECT sm.studio_id
      FROM studio_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- Studio members can delete their studio's queue jobs
CREATE POLICY "Studio members can delete queue jobs"
  ON intelligence_queue
  FOR DELETE
  TO authenticated
  USING (
    studio_id IN (
      SELECT sm.studio_id
      FROM studio_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Enable realtime for intelligence_events (for live feed updates)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE intelligence_events;

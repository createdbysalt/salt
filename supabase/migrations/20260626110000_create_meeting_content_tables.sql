-- Meeting content tables: normalized child records + provenance layer
-- Mirrors billing's source/provenance pattern for connector ingestion

-- ============================================================================
-- meeting_sources: provenance/source tracking
-- ============================================================================

CREATE TABLE public.meeting_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.client_meetings(id) ON DELETE CASCADE,

  -- Source identification
  provider text NOT NULL, -- manual | google-calendar | zoom | google-meet | google-drive | fireflies | recall
  kind text NOT NULL, -- calendar_event | recording | transcript | notes_doc | manual_entry
  external_id text, -- Provider-specific ID for dedup
  source_url text, -- Link to source (Drive doc, recording URL, etc.)

  -- Integration linkage (nullable for manual entries)
  workspace_integration_id uuid REFERENCES public.workspace_integrations(id) ON DELETE SET NULL,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  imported_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Dedup: one source per provider+external_id per workspace
  CONSTRAINT meeting_sources_dedup UNIQUE (workspace_id, provider, external_id),

  -- Valid provider values
  CONSTRAINT valid_provider CHECK (
    provider = ANY (ARRAY['manual', 'google-calendar', 'zoom', 'google-meet', 'google-drive', 'fireflies', 'recall'])
  ),

  -- Valid kind values
  CONSTRAINT valid_kind CHECK (
    kind = ANY (ARRAY['calendar_event', 'recording', 'transcript', 'notes_doc', 'manual_entry'])
  )
);

CREATE INDEX idx_meeting_sources_meeting ON public.meeting_sources(meeting_id);
CREATE INDEX idx_meeting_sources_workspace ON public.meeting_sources(workspace_id);
CREATE INDEX idx_meeting_sources_provider ON public.meeting_sources(provider);

COMMENT ON TABLE public.meeting_sources IS 'Provenance tracking for meeting content - where data came from';
COMMENT ON COLUMN public.meeting_sources.provider IS 'Source provider: manual, google-calendar, zoom, google-meet, google-drive, fireflies, recall';
COMMENT ON COLUMN public.meeting_sources.kind IS 'Type of source: calendar_event, recording, transcript, notes_doc, manual_entry';

-- ============================================================================
-- meeting_summaries: AI-generated or manual summaries
-- ============================================================================

CREATE TABLE public.meeting_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.client_meetings(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.meeting_sources(id) ON DELETE SET NULL,

  -- Content
  content text NOT NULL,
  is_current boolean DEFAULT true,

  -- Generation metadata
  generated_by text, -- AI model name or 'manual'

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_meeting_summaries_meeting ON public.meeting_summaries(meeting_id);
CREATE INDEX idx_meeting_summaries_current ON public.meeting_summaries(meeting_id, is_current) WHERE is_current = true;

COMMENT ON TABLE public.meeting_summaries IS 'Meeting summaries - AI-generated or manually entered';

-- ============================================================================
-- meeting_decisions: key decisions made during meetings
-- ============================================================================

CREATE TABLE public.meeting_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.client_meetings(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.meeting_sources(id) ON DELETE SET NULL,

  -- Content
  text text NOT NULL,
  rationale text,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_meeting_decisions_meeting ON public.meeting_decisions(meeting_id);

COMMENT ON TABLE public.meeting_decisions IS 'Key decisions made during meetings';

-- ============================================================================
-- meeting_action_items: tasks extracted from meetings
-- ============================================================================

CREATE TABLE public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.client_meetings(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.meeting_sources(id) ON DELETE SET NULL,

  -- Content
  text text NOT NULL,
  assignee text, -- Free-form assignee name (may link to person later)
  assignee_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  due_date date,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  priority text, -- low | medium | high
  context text, -- Quote from meeting where this was discussed

  -- Future: link to Plays for routing
  play_id uuid, -- FK to plays table when ready

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Valid priority values
  CONSTRAINT valid_priority CHECK (
    priority IS NULL OR priority = ANY (ARRAY['low', 'medium', 'high'])
  )
);

CREATE INDEX idx_meeting_action_items_meeting ON public.meeting_action_items(meeting_id);
CREATE INDEX idx_meeting_action_items_assignee ON public.meeting_action_items(assignee_person_id) WHERE assignee_person_id IS NOT NULL;
CREATE INDEX idx_meeting_action_items_incomplete ON public.meeting_action_items(meeting_id, completed) WHERE completed = false;

COMMENT ON TABLE public.meeting_action_items IS 'Action items extracted from meetings';

-- ============================================================================
-- meeting_transcripts: full transcripts with segments
-- ============================================================================

CREATE TABLE public.meeting_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.client_meetings(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.meeting_sources(id) ON DELETE SET NULL,

  -- Content
  content text, -- Full raw transcript text
  segments jsonb, -- Array of {speaker: {name, email?}, text, startTime, endTime}

  -- Recording info
  duration_seconds integer,
  recording_url text,

  -- Status
  status text DEFAULT 'completed',

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Valid status values
  CONSTRAINT valid_transcript_status CHECK (
    status = ANY (ARRAY['pending', 'processing', 'completed', 'failed'])
  )
);

CREATE INDEX idx_meeting_transcripts_meeting ON public.meeting_transcripts(meeting_id);

COMMENT ON TABLE public.meeting_transcripts IS 'Meeting transcripts with structured segments';

-- ============================================================================
-- RLS Policies: workspace-member view/manage
-- Mirrors client_meetings policies from 20260625193000_active_workspace_id_rename.sql
-- ============================================================================

ALTER TABLE public.meeting_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

-- meeting_sources
CREATE POLICY "Workspace members can view meeting sources"
  ON public.meeting_sources FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage meeting sources"
  ON public.meeting_sources FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- meeting_summaries
CREATE POLICY "Workspace members can view meeting summaries"
  ON public.meeting_summaries FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage meeting summaries"
  ON public.meeting_summaries FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- meeting_decisions
CREATE POLICY "Workspace members can view meeting decisions"
  ON public.meeting_decisions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage meeting decisions"
  ON public.meeting_decisions FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- meeting_action_items
CREATE POLICY "Workspace members can view meeting action items"
  ON public.meeting_action_items FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage meeting action items"
  ON public.meeting_action_items FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- meeting_transcripts
CREATE POLICY "Workspace members can view meeting transcripts"
  ON public.meeting_transcripts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage meeting transcripts"
  ON public.meeting_transcripts FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Grant access to authenticated users (standard pattern)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_action_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_transcripts TO authenticated;

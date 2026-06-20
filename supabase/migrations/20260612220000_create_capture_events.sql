-- ============================================================================
-- CAPTURE EVENTS: Universal intake layer for all business context
-- Migration: Create capture_events and capture_routing_decisions tables
-- ============================================================================
--
-- Capture is the universal intake for Salt. Every piece of context — from
-- connected apps (Gmail, Calendar, Stripe, etc.) or manual user entry —
-- flows through capture_events before routing to Memory surfaces.
--
-- Key design decisions (from 2026-06-12 founder interview):
-- 1. One capture can route to multiple surfaces simultaneously
-- 2. Each surface update has its own confidence score
-- 3. High-confidence routes execute automatically; low-confidence goes to Pending
-- 4. Stream is audit log (rarely viewed); Pending is action surface
-- 5. Corrections feed back into learning
--
-- ============================================================================

-- ============================================================================
-- 1. CAPTURE SOURCE TYPES
-- ============================================================================

-- Connector categories that produce captures
CREATE TYPE public.capture_source_type AS ENUM (
  -- Communication
  'gmail',
  'outlook',
  'slack',
  'whatsapp',
  'discord',
  'telegram',
  -- Calendar & Scheduling
  'googlecalendar',
  'outlook_calendar',
  'calendly',
  'calcom',
  -- Meetings
  'fireflies',
  'granola',
  'zoom',
  -- Files
  'googledrive',
  'googledocs',
  'googlesheets',
  'googleslides',
  'onedrive',
  'dropbox',
  -- Payments & Finance
  'stripe',
  'quickbooks',
  'square',
  'mercury',
  -- CRM
  'hubspot',
  'salesforce',
  'pipedrive',
  -- Productivity
  'notion',
  'linear',
  'asana',
  'clickup',
  'trello',
  'airtable',
  -- Social
  'instagram',
  'linkedin',
  'facebook',
  'youtube',
  -- Marketing
  'mailchimp',
  'kit',
  -- Manual entry
  'manual',
  'ask_salt'
);

-- What kind of thing was captured
CREATE TYPE public.capture_event_type AS ENUM (
  'message',           -- Email, chat message, DM
  'thread',            -- Conversation thread
  'meeting',           -- Calendar event or meeting recording
  'transcript',        -- Meeting transcript
  'file',              -- Document, spreadsheet, etc.
  'contact',           -- Person or organization info
  'payment',           -- Invoice, payment, subscription
  'task',              -- To-do, issue, ticket
  'note',              -- Freeform note
  'post',              -- Social media post
  'event',             -- Generic event/activity
  'other'
);

-- How the capture entered Salt
CREATE TYPE public.capture_origin AS ENUM (
  'added',    -- User intentionally entered
  'found'     -- Salt discovered from ambient source
);

-- Capture processing state
CREATE TYPE public.capture_state AS ENUM (
  'pending',    -- Needs human review/routing
  'routed',     -- Successfully routed to Memory
  'dismissed'   -- User dismissed, won't route
);

-- Target Memory surfaces
CREATE TYPE public.memory_surface AS ENUM (
  'people',
  'orgs',
  'work',
  'files',
  'conversations',
  'meetings',
  'teams',
  'me'
);

-- Routing decision status
CREATE TYPE public.routing_status AS ENUM (
  'auto_routed',   -- High confidence, routed automatically
  'pending',       -- Low confidence, waiting for approval
  'approved',      -- User approved the routing
  'dismissed',     -- User dismissed this routing
  'corrected'      -- User corrected the routing
);

-- What action was taken on the target
CREATE TYPE public.routing_action AS ENUM (
  'created',    -- New record created
  'updated',    -- Existing record updated
  'linked'      -- Linked to existing record (no field changes)
);

-- ============================================================================
-- 2. CAPTURE EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.capture_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Source identification
  source_type public.capture_source_type NOT NULL,
  source_connection_id UUID REFERENCES public.workspace_integrations(id) ON DELETE SET NULL,
  source_external_id TEXT,  -- Unique ID from source system (for dedup)

  -- Capture classification
  capture_type public.capture_event_type NOT NULL,
  origin public.capture_origin NOT NULL DEFAULT 'found',

  -- Content
  title TEXT,                          -- Human-readable summary
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Original data from source
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Normalized/parsed data

  -- Processing state
  state public.capture_state NOT NULL DEFAULT 'pending',
  overall_confidence INTEGER CHECK (overall_confidence >= 0 AND overall_confidence <= 100),

  -- Bootstrap tracking (for first-scan)
  is_bootstrap BOOLEAN DEFAULT FALSE,  -- Part of initial connector scan

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ,  -- When routing completed

  -- Dedup constraint: same source item shouldn't be captured twice
  CONSTRAINT capture_events_source_unique UNIQUE NULLS NOT DISTINCT (
    workspace_id, source_type, source_external_id
  )
);

-- ============================================================================
-- 3. CAPTURE ROUTING DECISIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.capture_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_event_id UUID NOT NULL REFERENCES public.capture_events(id) ON DELETE CASCADE,

  -- Target
  target_surface public.memory_surface NOT NULL,
  target_entity_id UUID,  -- The record that was created/updated/linked
  target_entity_type TEXT,  -- Table name for polymorphic reference

  -- Decision
  action public.routing_action,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  status public.routing_status NOT NULL DEFAULT 'pending',

  -- Reasoning (for transparency)
  reason TEXT,  -- Why Salt chose this routing
  evidence JSONB DEFAULT '[]'::jsonb,  -- Supporting data points

  -- Review tracking
  routed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- Correction data (when status = 'corrected')
  original_target_entity_id UUID,  -- What Salt originally suggested
  correction_notes TEXT,  -- What the user changed

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One decision per surface per capture
  CONSTRAINT capture_routing_unique_surface UNIQUE (capture_event_id, target_surface)
);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

-- Capture events
CREATE INDEX IF NOT EXISTS idx_capture_events_workspace ON public.capture_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_capture_events_source_type ON public.capture_events(source_type);
CREATE INDEX IF NOT EXISTS idx_capture_events_state ON public.capture_events(state);
CREATE INDEX IF NOT EXISTS idx_capture_events_created_at ON public.capture_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capture_events_origin ON public.capture_events(origin);

-- Pending captures (the action surface)
CREATE INDEX IF NOT EXISTS idx_capture_events_pending ON public.capture_events(workspace_id, created_at DESC)
  WHERE state = 'pending';

-- Bootstrap captures (for first-run tracking)
CREATE INDEX IF NOT EXISTS idx_capture_events_bootstrap ON public.capture_events(workspace_id, source_type)
  WHERE is_bootstrap = TRUE;

-- Routing decisions
CREATE INDEX IF NOT EXISTS idx_capture_routing_capture ON public.capture_routing_decisions(capture_event_id);
CREATE INDEX IF NOT EXISTS idx_capture_routing_target ON public.capture_routing_decisions(target_entity_id)
  WHERE target_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_capture_routing_status ON public.capture_routing_decisions(status);

-- Pending decisions (for approval queue)
CREATE INDEX IF NOT EXISTS idx_capture_routing_pending ON public.capture_routing_decisions(capture_event_id)
  WHERE status = 'pending';

-- ============================================================================
-- 5. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER capture_events_updated_at
  BEFORE UPDATE ON public.capture_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER capture_routing_decisions_updated_at
  BEFORE UPDATE ON public.capture_routing_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.capture_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capture_routing_decisions ENABLE ROW LEVEL SECURITY;

-- Capture events: workspace members can view
CREATE POLICY "workspace_members_view_capture_events" ON public.capture_events
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Capture events: workspace members can create (for manual captures)
CREATE POLICY "workspace_members_create_capture_events" ON public.capture_events
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Capture events: workspace members can update (for state changes)
CREATE POLICY "workspace_members_update_capture_events" ON public.capture_events
FOR UPDATE USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Routing decisions: accessible via capture_event join
CREATE POLICY "workspace_members_view_routing_decisions" ON public.capture_routing_decisions
FOR SELECT USING (
  capture_event_id IN (
    SELECT id FROM public.capture_events
    WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "workspace_members_manage_routing_decisions" ON public.capture_routing_decisions
FOR ALL USING (
  capture_event_id IN (
    SELECT id FROM public.capture_events
    WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Get pending captures for a workspace (the action queue)
CREATE OR REPLACE FUNCTION public.get_pending_captures(p_workspace_id UUID)
RETURNS TABLE (
  capture_id UUID,
  title TEXT,
  capture_type public.capture_event_type,
  source_type public.capture_source_type,
  origin public.capture_origin,
  overall_confidence INTEGER,
  created_at TIMESTAMPTZ,
  routing_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id AS capture_id,
    ce.title,
    ce.capture_type,
    ce.source_type,
    ce.origin,
    ce.overall_confidence,
    ce.created_at,
    COUNT(crd.id) AS routing_count
  FROM public.capture_events ce
  LEFT JOIN public.capture_routing_decisions crd ON crd.capture_event_id = ce.id
  WHERE ce.workspace_id = p_workspace_id
    AND ce.state = 'pending'
  GROUP BY ce.id
  ORDER BY ce.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get capture stream (audit log - all captures)
CREATE OR REPLACE FUNCTION public.get_capture_stream(
  p_workspace_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  capture_id UUID,
  title TEXT,
  capture_type public.capture_event_type,
  source_type public.capture_source_type,
  origin public.capture_origin,
  state public.capture_state,
  overall_confidence INTEGER,
  created_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id AS capture_id,
    ce.title,
    ce.capture_type,
    ce.source_type,
    ce.origin,
    ce.state,
    ce.overall_confidence,
    ce.created_at,
    ce.processed_at
  FROM public.capture_events ce
  WHERE ce.workspace_id = p_workspace_id
  ORDER BY ce.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record a correction (feeds into learning)
CREATE OR REPLACE FUNCTION public.record_capture_correction(
  p_routing_id UUID,
  p_new_entity_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.capture_routing_decisions
  SET
    status = 'corrected',
    original_target_entity_id = target_entity_id,
    target_entity_id = p_new_entity_id,
    correction_notes = p_notes,
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_routing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.capture_events IS
  'Universal intake for all business context. Every connector and manual entry flows through here.';

COMMENT ON TABLE public.capture_routing_decisions IS
  'Per-surface routing decisions for each capture. One capture can route to multiple Memory surfaces.';

COMMENT ON COLUMN public.capture_events.extracted_data IS
  'Normalized data extracted from raw_payload. Structure varies by capture_type.';

COMMENT ON COLUMN public.capture_events.overall_confidence IS
  'Aggregate confidence score (0-100). Individual surface confidences in routing_decisions.';

COMMENT ON COLUMN public.capture_routing_decisions.evidence IS
  'JSON array of evidence points that support this routing decision.';

COMMENT ON COLUMN public.capture_routing_decisions.original_target_entity_id IS
  'When status=corrected, this holds what Salt originally suggested before user correction.';

-- ============================================================================
-- DONE: Capture events schema created
-- Next: Wire capture service layer and ingestion workers
-- ============================================================================

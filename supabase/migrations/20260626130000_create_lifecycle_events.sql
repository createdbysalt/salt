-- ============================================================================
-- LIFECYCLE EVENTS TABLE
-- Migration: Track relationship progression over time
-- ============================================================================
--
-- Records state transitions for People, Orgs, and Work. Each event captures:
-- - What changed (event_type, from_value, to_value)
-- - Why it changed (source, source_ref, confidence, because)
-- - When it changed (created_at)
--
-- This enables relationship timeline views and lifecycle analytics.
--
-- ============================================================================

-- ============================================================================
-- 1. LIFECYCLE EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Entity reference
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'organization', 'work')),
  entity_id UUID NOT NULL,

  -- The transition
  event_type TEXT NOT NULL CHECK (event_type IN (
    'status_change',
    'relationship_change',
    'health_change',
    'first_contact',
    'first_payment',
    'became_inactive',
    'reactivated',
    'merged',
    'created'
  )),
  from_value TEXT,  -- nullable for first event (e.g., 'created')
  to_value TEXT NOT NULL,

  -- Provenance
  source TEXT NOT NULL CHECK (source IN ('rule', 'ai_inference', 'manual', 'system')),
  source_ref TEXT,  -- email_id, meeting_id, capture_id, etc.
  confidence NUMERIC(5,2),  -- 0.00 to 100.00
  because TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_workspace
  ON public.lifecycle_events(workspace_id);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_entity
  ON public.lifecycle_events(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_created_at
  ON public.lifecycle_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_type
  ON public.lifecycle_events(event_type);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.lifecycle_events ENABLE ROW LEVEL SECURITY;

-- Workspace members can view lifecycle events in their workspace
CREATE POLICY "workspace_members_view_lifecycle_events" ON public.lifecycle_events
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Workspace members can create lifecycle events
CREATE POLICY "workspace_members_create_lifecycle_events" ON public.lifecycle_events
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Service role can insert (for system/automated events)
CREATE POLICY "service_role_insert_lifecycle_events" ON public.lifecycle_events
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
);

-- ============================================================================
-- 4. TRIGGER: Auto-log organization status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_org_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.relationship_status IS DISTINCT FROM NEW.relationship_status THEN
    INSERT INTO public.lifecycle_events (
      workspace_id,
      entity_type,
      entity_id,
      event_type,
      from_value,
      to_value,
      source,
      because,
      created_by
    ) VALUES (
      NEW.studio_id,
      'organization',
      NEW.id,
      'status_change',
      OLD.relationship_status,
      NEW.relationship_status,
      'manual',
      'Relationship status updated',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER org_status_change_trigger
  AFTER UPDATE ON public.organizations
  FOR EACH ROW
  WHEN (OLD.relationship_status IS DISTINCT FROM NEW.relationship_status)
  EXECUTE FUNCTION public.log_org_status_change();

-- ============================================================================
-- 5. TRIGGER: Auto-log person relationship type changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_person_relationship_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.relationship_type IS DISTINCT FROM NEW.relationship_type THEN
    INSERT INTO public.lifecycle_events (
      workspace_id,
      entity_type,
      entity_id,
      event_type,
      from_value,
      to_value,
      source,
      because,
      created_by
    ) VALUES (
      NEW.studio_id,
      'person',
      NEW.id,
      'relationship_change',
      OLD.relationship_type,
      NEW.relationship_type,
      'manual',
      'Relationship type updated',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER person_relationship_change_trigger
  AFTER UPDATE ON public.people
  FOR EACH ROW
  WHEN (OLD.relationship_type IS DISTINCT FROM NEW.relationship_type)
  EXECUTE FUNCTION public.log_person_relationship_change();

-- ============================================================================
-- 6. TRIGGER: Auto-log person status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_person_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.relationship_status IS DISTINCT FROM NEW.relationship_status THEN
    INSERT INTO public.lifecycle_events (
      workspace_id,
      entity_type,
      entity_id,
      event_type,
      from_value,
      to_value,
      source,
      because,
      created_by
    ) VALUES (
      NEW.studio_id,
      'person',
      NEW.id,
      'status_change',
      OLD.relationship_status,
      NEW.relationship_status,
      'manual',
      'Relationship status updated',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER person_status_change_trigger
  AFTER UPDATE ON public.people
  FOR EACH ROW
  WHEN (OLD.relationship_status IS DISTINCT FROM NEW.relationship_status)
  EXECUTE FUNCTION public.log_person_status_change();

-- ============================================================================
-- 7. HELPER: Get lifecycle events for an entity
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_entity_lifecycle_events(
  p_workspace_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  from_value TEXT,
  to_value TEXT,
  source TEXT,
  because TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    le.id,
    le.event_type,
    le.from_value,
    le.to_value,
    le.source,
    le.because,
    le.created_at
  FROM public.lifecycle_events le
  WHERE le.workspace_id = p_workspace_id
    AND le.entity_type = p_entity_type
    AND le.entity_id = p_entity_id
  ORDER BY le.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE: Lifecycle events table created with triggers
-- ============================================================================

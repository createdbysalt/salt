-- ============================================================================
-- Add resolution columns to capture_events
-- ============================================================================
-- Track which Person/Org each captured email was linked to.
-- This enables the real-time email linker to record its work.

-- Add resolved entity columns
ALTER TABLE public.capture_events
ADD COLUMN IF NOT EXISTS resolved_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS resolved_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Index for finding emails linked to a person
CREATE INDEX IF NOT EXISTS idx_capture_events_person
  ON public.capture_events(resolved_person_id)
  WHERE resolved_person_id IS NOT NULL;

-- Index for finding emails linked to an org
CREATE INDEX IF NOT EXISTS idx_capture_events_org
  ON public.capture_events(resolved_org_id)
  WHERE resolved_org_id IS NOT NULL;

COMMENT ON COLUMN public.capture_events.resolved_person_id IS 'Person this email was linked to during real-time processing';
COMMENT ON COLUMN public.capture_events.resolved_org_id IS 'Organization this email was linked to during real-time processing';

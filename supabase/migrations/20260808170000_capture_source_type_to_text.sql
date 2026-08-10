-- ============================================================================
-- capture_source_type: enum → TEXT (Sources plan Phase 5.2)
--
-- The enum froze capture sources at ~40 values; the connector registry already
-- seeds providers outside it (github, cal), so captures for those providers
-- failed at insert (22P02). Source-type validation moves app-side to the
-- connector registry / category adapters; the column becomes plain TEXT.
--
-- Non-destructive: every existing enum value is valid TEXT; no rows change.
-- ============================================================================

-- 1. Widen the column.
ALTER TABLE public.capture_events
  ALTER COLUMN source_type TYPE text;

-- 2. Recreate the two RPCs whose return types reference the enum.
-- IF EXISTS: staging drifted (both RPCs absent there) while the migrations
-- folder creates them — recreate keeps every environment on the same truth.
DROP FUNCTION IF EXISTS public.get_pending_captures(uuid);
DROP FUNCTION IF EXISTS public.get_capture_stream(uuid, integer, integer);

CREATE FUNCTION public.get_pending_captures(p_workspace_id UUID)
RETURNS TABLE (
  capture_id UUID,
  title TEXT,
  capture_type public.capture_event_type,
  source_type TEXT,
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

CREATE FUNCTION public.get_capture_stream(
  p_workspace_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  capture_id UUID,
  title TEXT,
  capture_type public.capture_event_type,
  source_type TEXT,
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

-- 3. Drop the enum (no remaining dependencies).
DROP TYPE public.capture_source_type;

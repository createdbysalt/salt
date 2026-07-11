-- ============================================================================
-- FIND ENTITIES MISSING NOTES
-- Pattern trigger helper: find people/orgs with many interactions but no notes
-- ============================================================================
--
-- Used by pattern-scanner to surface "Salt could learn more about X" prompts.
-- Returns entities with N+ interactions (captures) but 0 confirmed notes.
--
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_entities_missing_notes(
  p_workspace_id UUID,
  p_min_interactions INTEGER DEFAULT 5,
  p_entity_type TEXT DEFAULT 'person'
)
RETURNS TABLE (
  entity_id UUID,
  entity_name TEXT,
  interaction_count BIGINT,
  note_count BIGINT,
  last_interaction_at TIMESTAMPTZ
) AS $$
BEGIN
  IF p_entity_type = 'person' THEN
    RETURN QUERY
    SELECT
      p.id AS entity_id,
      p.display_name AS entity_name,
      COALESCE(ic.capture_count, 0) AS interaction_count,
      COALESCE(nc.note_count, 0) AS note_count,
      p.last_contacted_at AS last_interaction_at
    FROM public.people p
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS capture_count
      FROM public.capture_events ce
      WHERE ce.workspace_id = p_workspace_id
        AND ce.person_id = p.id
        AND ce.state = 'routed'
    ) ic ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS note_count
      FROM public.notes n
      WHERE n.workspace_id = p_workspace_id
        AND n.entity_type = 'person'
        AND n.entity_id = p.id
        AND n.status = 'confirmed'
        AND n.deleted_at IS NULL
    ) nc ON true
    WHERE p.workspace_id = p_workspace_id
      AND p.archived_at IS NULL
      AND COALESCE(ic.capture_count, 0) >= p_min_interactions
      AND COALESCE(nc.note_count, 0) = 0
    ORDER BY ic.capture_count DESC
    LIMIT 20;

  ELSIF p_entity_type = 'organization' THEN
    RETURN QUERY
    SELECT
      o.id AS entity_id,
      o.name AS entity_name,
      COALESCE(ic.capture_count, 0) AS interaction_count,
      COALESCE(nc.note_count, 0) AS note_count,
      o.last_contacted_at AS last_interaction_at
    FROM public.organizations o
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS capture_count
      FROM public.capture_events ce
      WHERE ce.workspace_id = p_workspace_id
        AND ce.organization_id = o.id
        AND ce.state = 'routed'
    ) ic ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS note_count
      FROM public.notes n
      WHERE n.workspace_id = p_workspace_id
        AND n.entity_type = 'organization'
        AND n.entity_id = o.id
        AND n.status = 'confirmed'
        AND n.deleted_at IS NULL
    ) nc ON true
    WHERE o.workspace_id = p_workspace_id
      AND o.archived_at IS NULL
      AND COALESCE(ic.capture_count, 0) >= p_min_interactions
      AND COALESCE(nc.note_count, 0) = 0
    ORDER BY ic.capture_count DESC
    LIMIT 20;

  ELSE
    RAISE EXCEPTION 'Unsupported entity type: %', p_entity_type;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role (admin client uses this)
GRANT EXECUTE ON FUNCTION public.find_entities_missing_notes(UUID, INTEGER, TEXT)
  TO service_role;

COMMENT ON FUNCTION public.find_entities_missing_notes IS
  'Find entities with many interactions but no notes. Used by pattern-scanner for "Salt could learn more" prompts.';

-- ============================================================================
-- DONE: Pattern trigger helper for missing entity notes
-- ============================================================================

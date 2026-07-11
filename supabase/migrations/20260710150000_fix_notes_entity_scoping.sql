-- Fix notes created via system:create-note that only had entity_links edges.
-- Those notes appeared under Connections but not the entity Notes tab.

-- ============================================================================
-- 1. GRANTS (42501 permission denied on RPCs / note_mentions)
-- ============================================================================

GRANT SELECT, INSERT, DELETE ON public.note_mentions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.note_mentions TO service_role;

GRANT EXECUTE ON FUNCTION public.get_entity_notes_with_provenance(UUID, TEXT, UUID, BOOLEAN)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_entity_notes_with_provenance(UUID, TEXT, UUID, BOOLEAN)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.get_backlinked_notes(UUID, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_backlinked_notes(UUID, TEXT, UUID)
  TO service_role;

-- ============================================================================
-- 2. BACKFILL entity_type / entity_id from legacy mention edges
-- ============================================================================

UPDATE public.notes n
SET
  entity_type = CASE el.target_type
    WHEN 'org' THEN 'organization'
    WHEN 'person' THEN 'person'
    WHEN 'work' THEN 'work'
  END,
  entity_id = el.target_id,
  source = COALESCE(n.source, 'system'),
  status = COALESCE(n.status, 'confirmed'),
  note_kind = COALESCE(n.note_kind, 'general')
FROM public.entity_links el
WHERE el.source_type = 'note'
  AND el.source_id = n.id
  AND el.relation_type = 'mention'
  AND el.target_type IN ('person', 'org', 'work')
  AND n.entity_type IS NULL
  AND n.deleted_at IS NULL;

-- Remove redundant primary-attachment mention edges (Notes tab uses entity columns).
DELETE FROM public.entity_links el
USING public.notes n
WHERE el.source_type = 'note'
  AND el.source_id = n.id
  AND el.relation_type = 'mention'
  AND n.entity_type IS NOT NULL
  AND n.entity_id = el.target_id
  AND (
    (n.entity_type = 'person' AND el.target_type = 'person')
    OR (n.entity_type = 'organization' AND el.target_type = 'org')
    OR (n.entity_type = 'work' AND el.target_type = 'work')
  );

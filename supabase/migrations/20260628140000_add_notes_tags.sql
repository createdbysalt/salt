-- ============================================================================
-- NOTES TAGS
-- Migration: Add tags array column to notes table
-- ============================================================================
--
-- Enables note-specific tagging for categorization and filtering.
-- Tags are stored as a text array for simplicity (no join table needed).
--
-- ============================================================================

-- ============================================================================
-- 1. ADD TAGS COLUMN
-- ============================================================================

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ============================================================================
-- 2. ADD INDEX FOR TAG FILTERING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notes_tags
  ON public.notes USING gin(tags)
  WHERE tags != '{}';

-- ============================================================================
-- 3. UPDATE HELPER FUNCTION TO INCLUDE TAGS
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_entity_notes_with_provenance(UUID, TEXT, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_entity_notes_with_provenance(
  p_workspace_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_include_dismissed BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  note_kind TEXT,
  source TEXT,
  source_ref TEXT,
  confidence NUMERIC,
  status TEXT,
  author_type TEXT,
  is_pinned BOOLEAN,
  tags TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.content,
    n.note_kind,
    n.source,
    n.source_ref,
    n.confidence,
    n.status,
    n.author_type,
    n.is_pinned,
    n.tags,
    n.created_at
  FROM public.notes n
  WHERE n.workspace_id = p_workspace_id
    AND n.entity_type = p_entity_type
    AND n.entity_id = p_entity_id
    AND n.deleted_at IS NULL
    AND (p_include_dismissed OR n.status != 'dismissed')
  ORDER BY n.is_pinned DESC, n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE: Notes tags column added
-- ============================================================================

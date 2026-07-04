-- ============================================================================
-- NOTES PROVENANCE
-- Migration: Add provenance tracking for Salt-authored entity notes
-- ============================================================================
--
-- Extends the notes table with:
-- - Entity scoping (link note directly to person/org/work)
-- - Provenance (source, confidence, status for Salt-authored notes)
-- - Note kind (fact, preference, context, relationship, flag)
--
-- ============================================================================

-- ============================================================================
-- 1. ADD ENTITY SCOPING COLUMNS
-- ============================================================================

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS entity_type TEXT
  CHECK (entity_type IN ('person', 'organization', 'work') OR entity_type IS NULL);

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS entity_id UUID;

-- ============================================================================
-- 2. ADD PROVENANCE COLUMNS
-- ============================================================================

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual', 'ai_capture', 'ai_inference', 'system'));

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS source_ref TEXT;  -- capture_id, email_id, meeting_id

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,2);  -- 0.00 to 100.00

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed'
  CHECK (status IN ('proposed', 'confirmed', 'dismissed'));

-- ============================================================================
-- 3. ADD NOTE KIND COLUMN
-- ============================================================================

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS note_kind TEXT DEFAULT 'general'
  CHECK (note_kind IN ('fact', 'preference', 'context', 'relationship', 'flag', 'general'));

-- ============================================================================
-- 4. ADD INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notes_entity
  ON public.notes(entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notes_status
  ON public.notes(status)
  WHERE status = 'proposed';

CREATE INDEX IF NOT EXISTS idx_notes_source
  ON public.notes(source);

-- ============================================================================
-- 5. HELPER: Get notes for an entity with provenance
-- ============================================================================

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
-- 6. UPDATE COMMENT
-- ============================================================================

COMMENT ON COLUMN public.notes.entity_type IS
  'Direct entity scoping. Null for Me notes (workspace-scoped only).';

COMMENT ON COLUMN public.notes.entity_id IS
  'ID of the linked entity (person, org, work). Null for Me notes.';

COMMENT ON COLUMN public.notes.source IS
  'Who/what created this note: manual (user), ai_capture (Salt from email/meeting), ai_inference (Salt inferred), system.';

COMMENT ON COLUMN public.notes.status IS
  'Review status: proposed (Salt wrote, needs review), confirmed (approved), dismissed (rejected).';

COMMENT ON COLUMN public.notes.note_kind IS
  'Classification: fact, preference, context, relationship, flag, general.';

-- ============================================================================
-- DONE: Notes provenance columns added
-- ============================================================================

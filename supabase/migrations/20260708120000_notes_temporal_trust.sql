-- ============================================================================
-- NOTES TEMPORAL & TRUST MANAGEMENT
-- Migration: Add temporal modeling and trust management for entity notes
-- ============================================================================
--
-- Extends the notes table with:
-- - Temporal modeling (occurred_at, last_accessed_at, superseded_by)
-- - Source tracking (evidence_sources, source_confidence_weight)
-- - Trust management (context_boundary, extraction_reasoning)
-- - New source: ask_salt (user told Salt via chat)
--
-- ============================================================================

-- ============================================================================
-- 1. ADD ASK_SALT SOURCE
-- ============================================================================

-- Drop and recreate the CHECK constraint to add 'ask_salt'
ALTER TABLE public.notes
DROP CONSTRAINT IF EXISTS notes_source_check;

ALTER TABLE public.notes
ADD CONSTRAINT notes_source_check
CHECK (source IN ('manual', 'ai_capture', 'ai_inference', 'system', 'ask_salt'));

-- ============================================================================
-- 2. ADD TEMPORAL COLUMNS
-- ============================================================================

-- When the fact was true (null = always true, e.g., "birthday is June 15")
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

-- Last time this note was accessed for context (staleness calculation)
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

-- Link to newer note that supersedes this one
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.notes(id);

-- ============================================================================
-- 3. ADD SOURCE TRACKING COLUMNS
-- ============================================================================

-- Array of evidence source IDs (capture_id, email_id, meeting_id)
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS evidence_sources TEXT[];

-- Confidence weight from source type (user: 25, explicit: 20, repeated: 10, etc.)
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS source_confidence_weight INTEGER;

-- ============================================================================
-- 4. ADD TRUST MANAGEMENT COLUMNS
-- ============================================================================

-- Domain boundary to prevent cross-pollination
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS context_boundary TEXT
CHECK (context_boundary IN ('billing', 'scheduling', 'work', 'personal') OR context_boundary IS NULL);

-- LLM reasoning for why this note was extracted (for transparency UI)
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS extraction_reasoning TEXT;

-- ============================================================================
-- 5. ADD INDEXES
-- ============================================================================

-- Index for finding superseded notes
CREATE INDEX IF NOT EXISTS idx_notes_superseded_by
  ON public.notes(superseded_by)
  WHERE superseded_by IS NOT NULL;

-- Index for staleness queries
CREATE INDEX IF NOT EXISTS idx_notes_last_accessed
  ON public.notes(last_accessed_at)
  WHERE last_accessed_at IS NOT NULL;

-- Index for context boundary filtering
CREATE INDEX IF NOT EXISTS idx_notes_context_boundary
  ON public.notes(context_boundary)
  WHERE context_boundary IS NOT NULL;

-- ============================================================================
-- 6. UPDATE HELPER FUNCTION
-- ============================================================================

-- Drop and recreate to include new columns
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
  occurred_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  superseded_by UUID,
  evidence_sources TEXT[],
  context_boundary TEXT,
  extraction_reasoning TEXT,
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
    n.occurred_at,
    n.last_accessed_at,
    n.superseded_by,
    n.evidence_sources,
    n.context_boundary,
    n.extraction_reasoning,
    n.created_at
  FROM public.notes n
  WHERE n.workspace_id = p_workspace_id
    AND n.entity_type = p_entity_type
    AND n.entity_id = p_entity_id
    AND n.deleted_at IS NULL
    AND n.superseded_by IS NULL  -- Don't return superseded notes
    AND (p_include_dismissed OR n.status != 'dismissed')
  ORDER BY n.is_pinned DESC, n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.notes.occurred_at IS
  'When the fact was true. Null = always true (e.g., birthday). Distinct from created_at.';

COMMENT ON COLUMN public.notes.last_accessed_at IS
  'Last time this note was used in context. For staleness calculation.';

COMMENT ON COLUMN public.notes.superseded_by IS
  'ID of the note that replaced this one. Superseded notes are archived, not deleted.';

COMMENT ON COLUMN public.notes.evidence_sources IS
  'Array of evidence source IDs (capture_id, email_id) for multi-source notes.';

COMMENT ON COLUMN public.notes.source_confidence_weight IS
  'Weight from source type: user=25, explicit=20, meeting=15, repeated=10, inferred=5.';

COMMENT ON COLUMN public.notes.context_boundary IS
  'Domain boundary: billing, scheduling, work, personal. Prevents memory seepage.';

COMMENT ON COLUMN public.notes.extraction_reasoning IS
  'LLM reasoning for extraction. Shown in transparency UI ("Why did Salt extract this?").';

-- ============================================================================
-- DONE: Temporal and trust management columns added
-- ============================================================================

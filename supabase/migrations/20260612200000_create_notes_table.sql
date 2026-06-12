-- ============================================================================
-- NOTES TABLE: Obsidian-style markdown notes with wikilinks
-- Migration: Create notes table for Memory feature
-- ============================================================================
--
-- Notes are workspace-scoped markdown documents that can link to entities
-- (people, organizations, work) via [[wikilinks]]. Links are stored in
-- the existing entity_relations table with relation_type = 'mentioned_in'.
--
-- ============================================================================

-- ============================================================================
-- 1. NOTES TABLE
-- Purpose: Markdown notes with wikilink support for Memory feature
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Content
  title TEXT,                    -- Optional, can be extracted from first heading
  content TEXT NOT NULL,         -- Markdown with [[wikilinks]]

  -- Categorization
  category TEXT DEFAULT 'note'
    CHECK (category IN ('note', 'idea', 'reminder', 'reflection', 'reference')),

  -- Author tracking
  author_type TEXT DEFAULT 'user'
    CHECK (author_type IN ('user', 'salt')),

  -- State
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON public.notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON public.notes(created_by);
CREATE INDEX IF NOT EXISTS idx_notes_category ON public.notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON public.notes(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON public.notes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);

-- Full-text search on content
CREATE INDEX IF NOT EXISTS idx_notes_content_search ON public.notes
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || content));

-- ============================================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Workspace members can view notes in their workspace
CREATE POLICY "workspace_members_view_notes" ON public.notes
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Workspace members can create notes in their workspace
CREATE POLICY "workspace_members_create_notes" ON public.notes
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Users can update their own notes, admins/owners can update any note
CREATE POLICY "workspace_members_update_notes" ON public.notes
FOR UPDATE USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
  AND (
    created_by = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
);

-- Users can delete (soft) their own notes, admins/owners can delete any note
CREATE POLICY "workspace_members_delete_notes" ON public.notes
FOR DELETE USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
  AND (
    created_by = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
);

-- ============================================================================
-- 5. HELPER FUNCTION: Get notes that mention an entity
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_notes_mentioning_entity(
  p_workspace_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  note_id UUID,
  title TEXT,
  content TEXT,
  author_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id AS note_id,
    n.title,
    n.content,
    n.author_type,
    n.created_at
  FROM public.notes n
  INNER JOIN public.entity_relations er ON (
    er.from_entity_type = 'note'
    AND er.from_entity_id = n.id
    AND er.to_entity_type = p_entity_type
    AND er.to_entity_id = p_entity_id
    AND er.relation_type = 'mentioned_in'
  )
  WHERE n.workspace_id = p_workspace_id
    AND n.deleted_at IS NULL
  ORDER BY n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE: Notes table created with RLS and helper function
-- ============================================================================

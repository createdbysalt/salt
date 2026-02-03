-- ============================================================================
-- ALTER: Conversations Table Enhancements
-- ============================================================================
-- Adds columns for response time tracking, archiving, tagging, and notes
-- to help studios organize and manage client communication.
-- ============================================================================

-- ============================================================================
-- NEW COLUMNS
-- ============================================================================

-- Expected response time for SLA tracking (e.g., '24 hours', '1 day')
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS expected_response_time interval;

-- Archive flag for hiding old conversations from default view
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Tags array for organizing conversations (e.g., 'urgent', 'billing', 'project-xyz')
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Private notes visible only to studio members (not clients)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS studio_notes text;

-- Optional title for naming conversations (default: client name)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS title varchar(255);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for filtering archived/active conversations efficiently
CREATE INDEX IF NOT EXISTS idx_conversations_is_archived
  ON public.conversations(studio_id, is_archived);

-- GIN index for efficient tag filtering with array operators (@>, &&)
CREATE INDEX IF NOT EXISTS idx_conversations_tags
  ON public.conversations USING gin(tags);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.conversations.expected_response_time IS 'Expected SLA for responses (e.g., ''24 hours'', ''1 day'')';
COMMENT ON COLUMN public.conversations.is_archived IS 'Whether conversation is archived (hidden from default list)';
COMMENT ON COLUMN public.conversations.tags IS 'Array of tags for organizing conversations';
COMMENT ON COLUMN public.conversations.studio_notes IS 'Private notes visible only to studio members';
COMMENT ON COLUMN public.conversations.title IS 'Optional custom title for the conversation';

-- ============================================================================
-- IMPROVE: Messages Table (full-text search, knowledge mentions, threading)
-- ============================================================================
-- Adds columns required for messaging improvements:
-- - Full-text search via tsvector column with GIN index
-- - Knowledge mentions for linking files to messages
-- - Threading support via reply_to_id
-- - Urgency flag for priority messages
-- ============================================================================

-- ============================================================================
-- ADD COLUMNS
-- ============================================================================

-- Full-text search: tsvector column generated from content
-- Using 'english' dictionary for stemming and stop words
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS content_tsv tsvector
GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content, ''))) STORED;

-- Knowledge mentions: JSONB array of knowledge base item IDs
-- Example: [{"id": "uuid", "type": "file"}, {"id": "uuid", "type": "document"}]
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS knowledge_mentions jsonb DEFAULT '[]'::jsonb;

-- Threading: reference to parent message for reply chains
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Urgency: flag for high-priority messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_urgent boolean DEFAULT false;

-- ============================================================================
-- ADD INDEXES
-- ============================================================================

-- GIN index on content_tsv for fast full-text search
CREATE INDEX IF NOT EXISTS idx_messages_content_tsv
ON public.messages USING GIN (content_tsv);

-- Index on reply_to_id for efficient thread queries
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id
ON public.messages(reply_to_id)
WHERE reply_to_id IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.messages.content_tsv IS 'Generated tsvector column for full-text search on message content';
COMMENT ON COLUMN public.messages.knowledge_mentions IS 'JSONB array of knowledge base items mentioned/linked in this message';
COMMENT ON COLUMN public.messages.reply_to_id IS 'Reference to parent message for threading support';
COMMENT ON COLUMN public.messages.is_urgent IS 'Flag indicating high-priority message requiring immediate attention';

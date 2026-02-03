-- ============================================================================
-- FUNCTION: search_messages_fulltext
-- ============================================================================
-- Full-text search function for messages using tsvector with filters.
-- Used by searchMessagesFullText server action.
-- ============================================================================

CREATE OR REPLACE FUNCTION search_messages_fulltext(
  search_query TEXT,
  conversation_ids UUID[],
  from_date TIMESTAMPTZ DEFAULT NULL,
  to_date TIMESTAMPTZ DEFAULT NULL,
  sender_id_filter UUID DEFAULT NULL,
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  sender_type TEXT,
  content TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.sender_type::TEXT,
    m.content,
    m.read_at,
    m.created_at,
    ts_rank(m.content_tsv, plainto_tsquery('english', search_query)) AS rank
  FROM messages m
  WHERE
    m.conversation_id = ANY(conversation_ids)
    AND m.content_tsv @@ plainto_tsquery('english', search_query)
    AND (from_date IS NULL OR m.created_at >= from_date)
    AND (to_date IS NULL OR m.created_at <= to_date)
    AND (sender_id_filter IS NULL OR m.sender_id = sender_id_filter)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_messages_fulltext TO authenticated;

COMMENT ON FUNCTION search_messages_fulltext IS 'Full-text search for messages using tsvector with optional date range and sender filters';

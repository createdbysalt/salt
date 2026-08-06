-- Capture Enrichment: Add enriched_metadata column for rich capture context
-- Stores signals, play-fit scores, linked records, and suggested actions

ALTER TABLE capture_events
ADD COLUMN IF NOT EXISTS enriched_metadata JSONB DEFAULT '{}'::jsonb;

-- Index for querying by signals (GIN for JSONB array containment)
CREATE INDEX IF NOT EXISTS idx_capture_events_enriched_signals
ON capture_events USING GIN ((enriched_metadata -> 'signals_matched'));

-- Index for querying linked records by surface
CREATE INDEX IF NOT EXISTS idx_capture_events_enriched_linked
ON capture_events USING GIN ((enriched_metadata -> 'linked_records'));

-- Comment documenting the structure
COMMENT ON COLUMN capture_events.enriched_metadata IS 'Rich capture context including:
- sender: { email, name, classification, confidence, relationship_strength }
- recipients: { to[], cc[], bcc[] }
- thread: { is_reply, thread_id, message_count, in_reply_to }
- attachments: [{ name, mime, size }]
- signals_matched: string[]
- linked_records: [{ surface, entity_id, entity_label, match_type, confidence }]
- play_fit: { [play_slug]: { score, reason } }
- suggested_actions: [{ action, ... }]
- deep_link: URL to view in source app';

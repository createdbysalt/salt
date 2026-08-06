-- Ensure enriched_metadata column exists (ledger showed applied but column missing)
-- This migration is idempotent (IF NOT EXISTS)

ALTER TABLE capture_events
ADD COLUMN IF NOT EXISTS enriched_metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_capture_events_enriched_signals
ON capture_events USING GIN ((enriched_metadata -> 'signals_matched'));

CREATE INDEX IF NOT EXISTS idx_capture_events_enriched_linked
ON capture_events USING GIN ((enriched_metadata -> 'linked_records'));

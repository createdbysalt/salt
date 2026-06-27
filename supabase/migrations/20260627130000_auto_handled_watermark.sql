-- Phase 3: Auto-handled watermark for Plays queue
-- Tracks when the user last viewed auto-handled items so we can show only "new" ones.
-- See docs/plans/2026-06-25-play-card-contract.md

ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS auto_handled_seen_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.workspaces.auto_handled_seen_at IS
  'Timestamp of when auto-handled plays were last viewed. Items handled after this are "unreviewed".';

-- ============================================================================
-- PER-CONNECTION CAPTURE TOGGLE (connector-platform Phase 3.3b)
-- ============================================================================
--
-- Capture ("does this connection feed my memory?") is a per-connection user
-- setting ORTHOGONAL to the action trust ladder (decided 2026-07-03).
-- Default OFF with an explicit opt-in moment at connect time; trigger
-- subscriptions are created/removed when this flips, never at connect.
--
-- Grandfather clause: workspaces that connected the existing capture sources
-- before this toggle existed already had ingestion running (connect-time
-- bootstrap + Sync & Scan) — flipping them silently off would stop a
-- behavior they've observed and rely on. Active integrations of those
-- providers backfill to true; everything new defaults to false.
-- ============================================================================

ALTER TABLE public.workspace_integrations
  ADD COLUMN capture_enabled boolean NOT NULL DEFAULT false;

UPDATE public.workspace_integrations
SET capture_enabled = true
WHERE is_active = true
  AND provider IN ('gmail', 'googlecalendar', 'googledrive', 'stripe');

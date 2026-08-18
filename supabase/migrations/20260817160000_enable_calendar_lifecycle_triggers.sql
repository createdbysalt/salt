-- Migration: Enable Google Calendar lifecycle triggers for capture
-- Purpose: Calendar intake lifecycle (Phase 3) — event updates and
--          cancellations flow through the webhook so a stored capture
--          tracks reality instead of going stale. The trigger-reconciliation
--          cron subscribes existing connections to newly enabled slugs.
--
-- Caveat: rows appear in connector_trigger_types only after a catalog sync
-- that includes these slugs. If this UPDATE matches 0 rows, re-run the
-- enablement after the next sync.

UPDATE public.connector_trigger_types
SET enabled_for_capture = true
WHERE trigger_slug IN (
  'GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_UPDATED_TRIGGER',
  'GOOGLECALENDAR_EVENT_CANCELED_DELETED_TRIGGER'
);

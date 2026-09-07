-- ============================================================================
-- REPAIR: tool_capabilities seed never landed despite ledger entry
-- ============================================================================
--
-- Staging (<project-ref>) marks 20260707160000_seed_tool_capabilities
-- as applied, but public.tool_capabilities held ZERO rows on 2026-08-29 —
-- the "ledger lies" failure mode documented in supabase/CLAUDE.md. With an
-- empty table, resolveCapabilityTool() returns null for every capability and
-- every connector-category playbook fetch step fails closed with
-- "No provider available for <capability>".
--
-- This re-runs the original seed verbatim (idempotent: ON CONFLICT DO
-- NOTHING) and fails loudly if the rows still don't land.
--
-- Rollback:
--   DELETE FROM public.tool_capabilities WHERE capability_key IN (
--     'read_email','send_message','draft_message','read_contacts',
--     'read_calendar','create_event','update_event','read_bookings',
--     'read_files','read_payments','read_invoices','create_invoice'
--   );
-- ============================================================================

INSERT INTO public.tool_capabilities (capability_key, tool_slug, provider_key, priority, notes) VALUES
  -- read_email
  ('read_email', 'GMAIL_FETCH_EMAILS', 'gmail', 10, 'Primary email reader'),
  -- send_message (user-visible mutation → approval tap at the gate)
  ('send_message', 'GMAIL_SEND_EMAIL', 'gmail', 10, NULL),
  -- draft_message (private draft, no approval needed)
  ('draft_message', 'GMAIL_CREATE_EMAIL_DRAFT', 'gmail', 10, NULL),
  -- read_contacts
  ('read_contacts', 'GMAIL_FETCH_EMAILS', 'gmail', 50, 'Contacts surface via message senders until a dedicated tool is mapped'),
  -- read_calendar
  ('read_calendar', 'GOOGLECALENDAR_EVENTS_LIST', 'googlecalendar', 10, NULL),
  -- create_event
  ('create_event', 'GOOGLECALENDAR_CREATE_EVENT', 'googlecalendar', 10, NULL),
  ('update_event', 'GOOGLECALENDAR_UPDATE_EVENT', 'googlecalendar', 10, NULL),
  -- read_bookings
  ('read_bookings', 'CAL_LIST_BOOKINGS', 'cal', 10, NULL),
  -- read_files
  ('read_files', 'GOOGLEDRIVE_FIND_FILE', 'googledrive', 10, NULL),
  ('read_files', 'GOOGLEDRIVE_LIST_FILES', 'googledrive', 20, 'Fallback: list when no query'),
  -- read_payments
  ('read_payments', 'STRIPE_LIST_CHARGES', 'stripe', 10, NULL),
  ('read_invoices', 'STRIPE_LIST_INVOICES', 'stripe', 10, NULL),
  -- create_invoice (draft-only per Stripe policy; still approval-gated)
  ('create_invoice', 'STRIPE_CREATE_INVOICE', 'stripe', 10, NULL)
ON CONFLICT (capability_key, tool_slug) DO NOTHING;

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM public.tool_capabilities;
  IF n = 0 THEN
    RAISE EXCEPTION 'tool_capabilities repair seed inserted zero rows';
  END IF;
END $$;

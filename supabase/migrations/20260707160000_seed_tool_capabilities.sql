-- ============================================================================
-- SEED TOOL CAPABILITIES (plan 2026-07-07 WS3.2)
-- ============================================================================
--
-- Curated capability → tool mappings for the MASTERED connectors (Gmail,
-- Google Calendar, Google Drive, Stripe, Cal.com). Master-next connectors
-- (Outlook, Slack, QuickBooks, HubSpot, Dropbox, Notion) add their rows as
-- part of mastering — a capability gains a second provider by inserting a row,
-- no playbook change.
--
-- priority: lower = preferred when several providers satisfy the same key.
-- Idempotent: ON CONFLICT DO NOTHING.
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
    RAISE EXCEPTION 'tool_capabilities seed inserted zero rows';
  END IF;
END $$;

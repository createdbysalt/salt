-- ============================================================================
-- Outlook siblings for read_email / draft_message / send_message
-- ============================================================================
--
-- Invoice Reminder (and other email plays) are authored against Gmail slugs.
-- The executor swaps to these Outlook tools when Outlook is the selected
-- inbox. Without the rows, capability fan-out cannot see Outlook.
--
-- Idempotent: ON CONFLICT DO NOTHING.
-- ============================================================================

INSERT INTO public.tool_capabilities (capability_key, tool_slug, provider_key, priority, notes) VALUES
  ('read_email', 'OUTLOOK_LIST_MESSAGES', 'outlook', 20, 'Outlook inbox reader'),
  ('draft_message', 'OUTLOOK_CREATE_DRAFT', 'outlook', 20, 'Outlook draft, same risk as Gmail'),
  ('send_message', 'OUTLOOK_SEND_EMAIL', 'outlook', 20, NULL)
ON CONFLICT (capability_key, tool_slug) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tool_capabilities
    WHERE capability_key = 'draft_message'
      AND tool_slug = 'OUTLOOK_CREATE_DRAFT'
  ) THEN
    RAISE EXCEPTION 'Outlook draft_message capability row missing after seed';
  END IF;
END $$;

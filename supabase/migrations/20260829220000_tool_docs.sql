-- ============================================================================
-- tool_docs: cached vendor API doc snippets per connector tool (Phase 2)
-- ============================================================================
--
-- Fresh-context layer: when a playbook step uses a tool, the executor injects
-- the tool's cached vendor doc notes into the draft/agent prompt so the model
-- works from real API semantics (gotchas, enum meanings, limits) instead of
-- guessing. Rows are platform-global reference data with a 7-day TTL;
-- curated head-tool docs are seeded here, the catalog sync refreshes them.
--
-- Posture mirrors tool_capabilities: authenticated read, service-role write.
--
-- Rollback: DROP TABLE public.tool_docs;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tool_docs (
  tool_slug text PRIMARY KEY,
  toolkit_slug text NOT NULL,
  doc_markdown text NOT NULL,
  source_url text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.tool_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_docs readable by authenticated" ON public.tool_docs;
CREATE POLICY "tool_docs readable by authenticated"
  ON public.tool_docs FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.tool_docs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_docs TO service_role;

-- Curated head-tool docs (short, gotcha-focused; refreshed by catalog sync).
INSERT INTO public.tool_docs (tool_slug, toolkit_slug, doc_markdown, source_url)
VALUES
  (
    'STRIPE_LIST_CHARGES',
    'stripe',
    E'# Stripe list charges\n\n- `limit`: 1-100, default 10. Paginate with `starting_after` (last charge id of previous page).\n- `created`: unix timestamp or range object `{gt, gte, lt, lte}`.\n- Returns most recent charges first. A charge with `paid=true` and `status=succeeded` is a completed payment.\n- `customer` filters to one customer id (`cus_...`).',
    'https://docs.stripe.com/api/charges/list'
  ),
  (
    'STRIPE_CREATE_INVOICE',
    'stripe',
    E'# Stripe create invoice\n\n- Creates a DRAFT invoice by default (`auto_advance=false`). Salt never auto-finalizes: drafts stay invisible to the customer until the user sends them from Stripe.\n- `customer` (required): `cus_...` id. `currency` defaults to the customer currency.\n- Line items are added separately; `description` shows on the invoice.\n- `due_date` vs `collection_method=send_invoice` + `days_until_due`: use one or the other.',
    'https://docs.stripe.com/api/invoices/create'
  ),
  (
    'GMAIL_CREATE_EMAIL_DRAFT',
    'gmail',
    E'# Gmail create draft\n\n- Creates a draft only — nothing is sent. `recipient_email`, `subject`, `body` are the core fields.\n- `thread_id` attaches the draft to an existing thread (use for replies).\n- `is_html` defaults to false; plain text bodies need no flag.\n- `cc`/`bcc` accept comma-separated addresses.',
    'https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/create'
  ),
  (
    'GMAIL_SEND_EMAIL',
    'gmail',
    E'# Gmail send message\n\n- Sends immediately — no undo. Prefer GMAIL_CREATE_EMAIL_DRAFT unless the user explicitly approved sending.\n- `thread_id` keeps the message in the existing conversation.\n- Bodies are plain text unless `is_html=true`.',
    'https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send'
  ),
  (
    'GOOGLECALENDAR_CREATE_EVENT',
    'googlecalendar',
    E'# Google Calendar create event\n\n- `summary`, `start_datetime`, `end_datetime` are required; datetimes are RFC 3339 with offset (e.g. 2026-08-30T14:00:00-05:00).\n- `timezone` (IANA, e.g. America/Toronto) avoids all-day drift.\n- `attendees` is a list of emails; Google sends invites automatically unless disabled.',
    'https://developers.google.com/calendar/api/v3/reference/events/insert'
  ),
  (
    'SLACK_SEND_MESSAGE',
    'slack',
    E'# Slack post message\n\n- `channel` (required): channel id (`C...`) or name. `text` is the fallback body.\n- `markdown_text` renders mrkdwn; `blocks` is the Block Kit JSON for rich layouts — do not invent block types.\n- `thread_ts` replies in a thread.',
    'https://api.slack.com/methods/chat.postMessage'
  ),
  (
    'QUICKBOOKS_CREATE_INVOICE',
    'quickbooks',
    E'# QuickBooks create invoice\n\n- `customer_id` (required): QBO customer id, not a name.\n- Line items need `amount`, `detail_type` (usually `SalesItemLineDetail`), and an item ref.\n- New invoices are drafts until emailed; `email_status` stays `NotSet` unless explicitly sent.',
    'https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice'
  )
ON CONFLICT (tool_slug) DO UPDATE
  SET doc_markdown = EXCLUDED.doc_markdown,
      source_url = EXCLUDED.source_url,
      fetched_at = now(),
      expires_at = now() + interval '7 days';

DO $$
BEGIN
  IF NOT has_table_privilege('service_role', 'public.tool_docs', 'SELECT') THEN
    RAISE EXCEPTION 'service_role still lacks SELECT on tool_docs';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.tool_docs', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated still lacks SELECT on tool_docs';
  END IF;
END $$;

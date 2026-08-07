-- Capture-pipeline repair Phase 4: classifications for the backfill read tools.
--
-- Composio reworked the QuickBooks / Calendly / Dropbox / Cal.com / Outlook
-- toolkits: many slugs verified 2026-07-13 now 404 on BOTH the metadata and
-- execute endpoints (verified live 2026-08-06 — same failure mode as the dead
-- SALESFORCE_* trigger slugs found in Phase 2). These are the current read
-- tools, verified live against GET /api/v3/tools and POST
-- /api/v3/tools/execute on 2026-08-06:
--
--   Calendly:   CALENDLY_GET_CURRENT_USER → CALENDLY_LIST_EVENTS →
--               CALENDLY_LIST_EVENT_INVITEES  (scheduled-events backfill)
--   Dropbox:    DROPBOX_LIST_FILES_IN_FOLDER  (recent-file backfill)
--   QuickBooks: QUICKBOOKS_CUSTOMER_BALANCE_DETAIL  (the only invoice-level
--               read left in the toolkit — invoice/payment reads are gone)
--   Cal.com:    CAL_FETCH_ALL_BOOKINGS  (replaces CAL_GET_TEAM_BOOKINGS,
--               which 404s — the cal backfill was silently broken)
--   Outlook:    OUTLOOK_OUTLOOK_GET_MESSAGE  (replaces OUTLOOK_GET_MESSAGE
--               for webhook enrichment) and OUTLOOK_OUTLOOK_LIST_MESSAGES
--               (new reconciliation backfill)
--
-- Seeded explicitly because backfills run unattended (cron context): the
-- executor requires an approved read classification, and the heuristic
-- fallback would classify QUICKBOOKS_CUSTOMER_BALANCE_DETAIL as mutating
-- (no read-pattern word in the slug), blocking the cron.

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_GET_CURRENT_USER', 'read', false, 'approved', 'seed', now(), 'Capture backfill read tool (verified live 2026-08-06)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_LIST_EVENTS', 'read', false, 'approved', 'seed', now(), 'Capture backfill read tool (verified live 2026-08-06)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_LIST_EVENT_INVITEES', 'read', false, 'approved', 'seed', now(), 'Capture backfill read tool (verified live 2026-08-06)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_LIST_FILES_IN_FOLDER', 'read', false, 'approved', 'seed', now(), 'Capture backfill read tool (verified live 2026-08-06)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_CUSTOMER_BALANCE_DETAIL', 'read', false, 'approved', 'seed', now(), 'Capture backfill read tool; report is the only invoice-level read in the reworked toolkit (verified live 2026-08-06)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_FETCH_ALL_BOOKINGS', 'read', false, 'approved', 'seed', now(), 'Cal.com bookings read; replaces dead CAL_GET_TEAM_BOOKINGS (verified live 2026-08-06)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_OUTLOOK_GET_MESSAGE', 'read', false, 'approved', 'seed', now(), 'Outlook message read; replaces dead OUTLOOK_GET_MESSAGE for webhook enrichment (verified live 2026-08-06)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_OUTLOOK_LIST_MESSAGES', 'read', false, 'approved', 'seed', now(), 'Outlook message list for reconciliation backfill (verified live 2026-08-06)')
ON CONFLICT (tool_slug) DO NOTHING;

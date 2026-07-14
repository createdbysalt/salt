-- Add tool classifications for newly enabled connectors (2026-07-13)
-- Outlook, Slack, HubSpot, QuickBooks, Calendly, Dropbox, Notion

-- Outlook
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_GET_MESSAGE', 'read', false, 'approved', 'seed', now(), 'Outlook read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_LIST_MESSAGES', 'read', false, 'approved', 'seed', now(), 'Outlook read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_GET_EVENT', 'read', false, 'approved', 'seed', now(), 'Outlook read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_GET_CALENDAR_VIEW', 'read', false, 'approved', 'seed', now(), 'Outlook read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_SEND_EMAIL', 'mutating', true, 'approved', 'seed', now(), 'Outlook mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_CREATE_DRAFT', 'mutating', false, 'approved', 'seed', now(), 'Outlook drafts auto-execute like Gmail')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_CALENDAR_CREATE_EVENT', 'mutating', true, 'approved', 'seed', now(), 'Outlook mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_FORWARD_MESSAGE', 'mutating', true, 'approved', 'seed', now(), 'Outlook mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

-- Slack
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_FETCH_CONVERSATION_HISTORY', 'read', false, 'approved', 'seed', now(), 'Slack read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_FIND_CHANNELS', 'read', false, 'approved', 'seed', now(), 'Slack read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_FIND_USERS', 'read', false, 'approved', 'seed', now(), 'Slack read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_GET_UNREAD_MESSAGES_FROM_USER', 'read', false, 'approved', 'seed', now(), 'Slack read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_CHAT_POST_MESSAGE', 'mutating', true, 'approved', 'seed', now(), 'Slack mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_ADD_REACTION_TO_AN_ITEM', 'mutating', false, 'approved', 'seed', now(), 'Slack reactions auto-execute (low stakes)')
ON CONFLICT (tool_slug) DO NOTHING;

-- HubSpot
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_LIST_COMPANY_ACTIVITIES', 'read', false, 'approved', 'seed', now(), 'HubSpot read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_LIST_COMPANY_MEETINGS', 'read', false, 'approved', 'seed', now(), 'HubSpot read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_LIST_DEAL_ACTIVITIES', 'read', false, 'approved', 'seed', now(), 'HubSpot read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_GET_PIPELINE_STAGE_AUDIT', 'read', false, 'approved', 'seed', now(), 'HubSpot read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_CREATE_CONTACT_FROM_NL', 'mutating', true, 'approved', 'seed', now(), 'HubSpot mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_CREATE_DEAL_FROM_NL', 'mutating', true, 'approved', 'seed', now(), 'HubSpot mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_CREATE_MEETING', 'mutating', true, 'approved', 'seed', now(), 'HubSpot mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

-- QuickBooks
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_GET_COMPANY_INFO', 'read', false, 'approved', 'seed', now(), 'QuickBooks read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_GET_BALANCE_SHEET_REPORT', 'read', false, 'approved', 'seed', now(), 'QuickBooks read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_GET_PROFIT_AND_LOSS_REPORT', 'read', false, 'approved', 'seed', now(), 'QuickBooks read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT', 'read', false, 'approved', 'seed', now(), 'QuickBooks read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_GET_REPORT_CASH_FLOW', 'read', false, 'approved', 'seed', now(), 'QuickBooks read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_GET_CHANGED_ENTITIES', 'read', false, 'approved', 'seed', now(), 'QuickBooks read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_CREATE_INVOICE', 'mutating', true, 'approved', 'seed', now(), 'QuickBooks mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_CREATE_ESTIMATE', 'mutating', true, 'approved', 'seed', now(), 'QuickBooks mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

-- Calendly
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_LIST_EVENT_TYPES', 'read', false, 'approved', 'seed', now(), 'Calendly read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_LIST_SCHEDULED_EVENTS', 'read', false, 'approved', 'seed', now(), 'Calendly read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_GET_USER', 'read', false, 'approved', 'seed', now(), 'Calendly read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_GET_EVENT_TYPE_AVAILABILITY', 'read', false, 'approved', 'seed', now(), 'Calendly read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_CANCEL_SCHEDULED_EVENT', 'mutating', true, 'approved', 'seed', now(), 'Calendly cancel requires approval')
ON CONFLICT (tool_slug) DO NOTHING;

-- Dropbox
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_FILES_SEARCH', 'read', false, 'approved', 'seed', now(), 'Dropbox read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_GET_ACCOUNT', 'read', false, 'approved', 'seed', now(), 'Dropbox read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_GET_SPACE_USAGE', 'read', false, 'approved', 'seed', now(), 'Dropbox read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_LIST_FILE_REQUESTS', 'read', false, 'approved', 'seed', now(), 'Dropbox read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_CREATE_FOLDER', 'mutating', true, 'approved', 'seed', now(), 'Dropbox mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_COPY_FILE_OR_FOLDER', 'mutating', true, 'approved', 'seed', now(), 'Dropbox mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_CREATE_SHARED_LINK', 'mutating', true, 'approved', 'seed', now(), 'Dropbox mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_DELETE_FILE', 'destructive', true, 'approved', 'seed', now(), 'Dropbox destructive - never executed')
ON CONFLICT (tool_slug) DO NOTHING;

-- Notion
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_FETCH_DATABASE', 'read', false, 'approved', 'seed', now(), 'Notion read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_QUERY_DATABASE', 'read', false, 'approved', 'seed', now(), 'Notion read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_GET_PAGE_MARKDOWN', 'read', false, 'approved', 'seed', now(), 'Notion read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_LIST_USERS', 'read', false, 'approved', 'seed', now(), 'Notion read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_FETCH_BLOCK_CONTENTS', 'read', false, 'approved', 'seed', now(), 'Notion read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_CREATE_NOTION_PAGE', 'mutating', true, 'approved', 'seed', now(), 'Notion mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_INSERT_ROW_DATABASE', 'mutating', true, 'approved', 'seed', now(), 'Notion mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_DELETE_BLOCK', 'destructive', true, 'approved', 'seed', now(), 'Notion destructive - never executed')
ON CONFLICT (tool_slug) DO NOTHING;

-- 49 new tool classifications added

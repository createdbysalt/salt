-- Seed remaining tool classifications from expanded tool-policy-registry (2026-07-14)
-- Generated to restore seed ↔ registry parity after connector expansion

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('FIREFLIES_SEARCH_TRANSCRIPTS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('FIREFLIES_GET_ASK_FRED_THREAD', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('FIREFLIES_GET_ASK_FRED_THREADS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('FIREFLIES_GET_MEETING_ANALYTICS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('FIREFLIES_GET_MEETING_PARTICIPANTS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('FIREFLIES_GET_MEETING_TOPICS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('FIREFLIES_GET_USER_GROUPS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('FIREFLIES_LIST_CHANNELS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('FIREFLIES_SET_USER_ROLE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_LIST_MEETINGS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_GET_A_MEETING', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_GET_A_MEETING_SUMMARY', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_GET_MEETING_RECORDINGS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_GET_USER', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_LIST_ALL_RECORDINGS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_LIST_MEETING_SUMMARY_TEMPLATES', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_LIST_WEBINAR_REGISTRANTS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_SEARCH_COMPANY_CONTACTS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_CREATE_A_MEETING', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_DELETE_A_MEETING', 'destructive', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('ZOOM_DELETE_RECORDING_FILE', 'destructive', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_GET_CALENDAR', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_GET_CALENDAR_SCHEDULE', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_LIST_CALENDARS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_CREATE_CONTACT', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_UPDATE_CONTACT', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_DELETE_CONTACT', 'destructive', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_DELETE_EMAIL', 'destructive', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('OUTLOOK_DELETE_EVENT', 'destructive', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_GET_TEAM_INFO', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_CONVERSATIONS_INFO', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_CONVERSATIONS_LIST', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_CONVERSATIONS_MEMBERS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_CONVERSATIONS_REPLIES', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_SEARCH_MESSAGES', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_USERS_INFO', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_CHAT_UPDATE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_CREATE_CHANNEL', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_CONVERSATIONS_JOIN', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_INVITE_TO_CHANNEL', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_SEND_DIRECT_MESSAGE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_SEND_MESSAGE_WEBHOOK', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('SLACK_UPLOAD_FILE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_READ_ASSOCIATIONS_BATCH', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_CREATE_CRM_OBJECT_FROM_NL', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_CREATE_PRODUCT', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_CREATE_TICKETS', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('HUBSPOT_CREATE_OBJECT_ASSOCIATION', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_GET_ACCOUNT', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_GET_INVOICE', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_GET_PURCHASE_ORDER', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_GET_VENDOR', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_FIND_PRODUCTS_AND_SERVICES', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_LIST_ACCOUNTS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_QUERY_ENTITY', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_CREATE_CUSTOMER', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_CREATE_PURCHASE_ORDER', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_SEND_INVOICE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_UPDATE_CUSTOMER', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('QUICKBOOKS_UPDATE_INVOICE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_GET_ORGANIZATION', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_LIST_ROUTING_FORM_SUBMISSIONS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_CREATE_EVENT_TYPE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_UPDATE_EVENT_TYPE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_UPDATE_EVENT_TYPE_AVAILABILITY', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_POST_INVITEE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_CREATE_WEBHOOKS', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_ORGANIZATION_INVITATION', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CALENDLY_DELETE_ORGANIZATION_MEMBERSHIP', 'destructive', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_GET_SHARED_FOLDER_METADATA', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_GET_TEAM_INFO', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_GET_TEAM_LOG_EVENTS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_CREATE_SHARED_LINK_SIMPLE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_CREATE_FILE_REQUEST', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_CREATE_PAPER_DOCUMENT', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_CREATE_TEAM_FOLDER', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_CREATE_TEAM_GROUP', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_ADD_FILE_MEMBER', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_ADD_FOLDER_MEMBER_ACTION', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_ADD_TEAM_GROUP_MEMBERS', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('DROPBOX_ADD_TEAM_MEMBERS', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_LIST_ALL_DATABASES', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_LIST_ALL_PAGES', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_FETCH_PAGE', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_FETCH_ALL_BLOCK_CONTENTS', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_FILTER_PAGE_BY_KEYWORD', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_SEARCH_ENTITY', 'read', false, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_CREATE_DATABASE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_CREATE_COMMENT', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_ADD_MULTIPLE_PAGE_CONTENT', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_UPDATE_DATABASE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_UPDATE_PAGE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('NOTION_UPDATE_ROW_IN_DATABASE', 'mutating', true, 'approved', 'seed', now(), 'Seeded from expanded TOOL_POLICIES (verified 2026-07-14)')
ON CONFLICT (tool_slug) DO NOTHING;


-- Add Cal.com tool classifications with verified slugs (2026-07-13)
-- These slugs were verified against Composio API using .scratch/list-cal-tools.ts

-- Read tools (auto-execute)
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_LIST_EVENT_TYPES', 'read', false, 'approved', 'seed', now(), 'Cal.com read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_GET_TEAM_BOOKINGS', 'read', false, 'approved', 'seed', now(), 'Cal.com read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_RETRIEVE_MY_INFORMATION', 'read', false, 'approved', 'seed', now(), 'Cal.com read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_RETRIEVE_CALENDAR_BUSY_TIMES', 'read', false, 'approved', 'seed', now(), 'Cal.com read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_RETRIEVE_CALENDAR_LIST', 'read', false, 'approved', 'seed', now(), 'Cal.com read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_LIST_ATTENDEES', 'read', false, 'approved', 'seed', now(), 'Cal.com read tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

-- Mutating tools (require approval)
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_ADD_ATTENDEE', 'mutating', true, 'approved', 'seed', now(), 'Cal.com mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_EDIT_BOOKING_BY_ID', 'mutating', true, 'approved', 'seed', now(), 'Cal.com mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_RESERVE_SLOT_FOR_EVENT', 'mutating', true, 'approved', 'seed', now(), 'Cal.com mutating tools (verified 2026-07-13)')
ON CONFLICT (tool_slug) DO NOTHING;

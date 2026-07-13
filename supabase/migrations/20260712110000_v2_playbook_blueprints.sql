-- Seed v2 playbook slugs for FK constraint support in profile_playbook_settings
-- These are minimal blueprint rows so v2 playbooks can have per-workspace threshold settings

INSERT INTO public.playbook_blueprints (
  slug, name, player_slug, kind, description, procedure_md, definition
)
VALUES
  -- _meta playbooks (layer: learn)
  ('hygiene', 'Memory Hygiene', 'keeper', 'profile',
   'Detects and surfaces duplicate or stale records for review.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  ('connections', 'Connections', 'keeper', 'profile',
   'Learns and enriches relationship context from connected accounts.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  ('notes', 'Notes', 'keeper', 'profile',
   'Extracts structured insights from meeting notes and conversations.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  ('daily-briefing', 'Daily Briefing', 'keeper', 'acting',
   'Creates a daily summary of priorities and updates.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  -- billing playbooks (layer: act)
  ('invoice-reminder', 'Invoice Reminder', 'billing', 'acting',
   'Drafts payment reminders for overdue invoices.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  ('payment-received', 'Payment Received', 'billing', 'acting',
   'Sends thank-you notes when payments are received.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  ('cash-runway', 'Cash Runway', 'billing', 'acting',
   'Weekly cash position summary and runway alert.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  -- meetings playbooks (layer: act)
  ('prep', 'Meeting Prep', 'meetings', 'acting',
   'Pre-meeting briefing with context and talking points.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  ('recap', 'Meeting Recap', 'meetings', 'acting',
   'Post-meeting summary with action items.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  -- relationships playbooks (layer: act)
  ('follow-up', 'Follow-up', 'follow-up', 'acting',
   'Drafts re-engagement messages for quiet contacts.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  ('relationship-health', 'Relationship Health', 'follow-up', 'acting',
   'Monitors relationship health and surfaces risks.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb),

  -- work playbooks (layer: act)
  ('blocker-watch', 'Blocker Watch', 'scope', 'acting',
   'Alerts when work items become blocked.',
   'Managed by v2 package system.', '{"version": 1}'::jsonb)

ON CONFLICT (slug) DO NOTHING;

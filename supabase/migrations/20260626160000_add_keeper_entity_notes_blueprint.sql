-- Add keeper-entity-notes blueprint for note authoring settings
INSERT INTO public.playbook_blueprints (
  slug, name, player_slug, description, kind, procedure_md, definition
)
VALUES (
  'keeper-entity-notes',
  'Entity Notes',
  'keeper',
  'Author durable learnings about people, organizations, and work from captured evidence.',
  'profile',
  '# Entity Notes

## What this does

Reads captured evidence (emails, meetings, messages) and authors durable learnings as notes attached to people, organizations, or work records.

## When to use

Automatically triggered when new evidence is captured that relates to a known entity.',
  '{}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

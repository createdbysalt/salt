-- Memory Records: Ask Salt chat routing (when_to_use for skill-style load_playbook)

UPDATE public.playbook_blueprints
SET
  when_to_use = 'User asks to add, create, log, or track people, organizations, work, billing records, files, or meetings in Memory. Also when they describe a new contact, client, project, or invoice they want saved.',
  description = 'Salt keeps your records complete and accurate — intake from Ask Salt and upkeep from connected accounts.',
  procedure_md = 'See v2 package PLAYBOOK.md and chat.yaml for Ask Salt intake procedure.',
  status = 'active',
  updated_at = now()
WHERE slug = 'memory-records';

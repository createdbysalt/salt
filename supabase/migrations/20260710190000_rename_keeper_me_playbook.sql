-- Rename "Me (Operator)" playbook to just "Me" and change trigger type to signal
UPDATE playbook_blueprints
SET
  name = 'Me',
  trigger = '{"type":"signal","signal":"operator_fact_observed"}'::jsonb,
  procedure_md = REPLACE(procedure_md, '# Me (Operator)', '# Me')
WHERE slug = 'keeper-me';

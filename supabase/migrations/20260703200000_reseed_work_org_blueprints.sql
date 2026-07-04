-- ============================================================================
-- RESEED keeper-work-records + keeper-organizations-records BLUEPRINTS
-- ============================================================================
--
-- Live verification (2026-07-03, Management API): playbook_blueprints holds
-- 9 rows but NOT keeper-work-records / keeper-organizations-records — the
-- 20260626115000 slug-rename migration's ledger says applied, but the rows
-- never materialized (the ledger-lies trap, third occurrence). Consequence:
-- every work/org field-edit provenance insert failed its blueprint_slug FK,
-- and since the writer swallowed errors, work/org Activity tabs silently
-- missed all manual edits (caught by the round-trip E2Es).
--
-- The writer now logs + retries with a NULL slug, and this migration puts
-- the rows back so provenance carries its blueprint again. Idempotent.
-- ============================================================================

INSERT INTO public.playbook_blueprints (
  slug, name, player_slug, description, kind, procedure_md, definition
)
VALUES
  (
    'keeper-work-records',
    'Work Records',
    'keeper',
    'Maintain durable work records: status, stage, pricing, contacts, and links from trusted evidence.',
    'profile',
    '# Work Records

Policy canon: app/_features/plays/playbooks/keeper-work-records/playbook.md and the keeper-field-contracts canon. Typed engine executes work profile fields via records-engine (apply-work-profile).',
    '{}'::jsonb
  ),
  (
    'keeper-organizations-records',
    'Organization Records',
    'keeper',
    'Maintain durable organization records: relationship, industry, contacts, and links from trusted evidence.',
    'profile',
    '# Organization Records

Policy canon: app/_features/plays/playbooks/keeper-organizations-records/playbook.md and the keeper-field-contracts canon. Typed engine executes org profile fields via records-engine (apply-org-profile).',
    '{}'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

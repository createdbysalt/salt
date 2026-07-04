-- ============================================================================
-- SEED KEEPER RECORD BLUEPRINTS (keeper-field-contracts Phase 5.1/5.2)
-- ============================================================================
--
-- Registers the four new Keeper record playbooks as blueprints so settings,
-- provenance rows, and future engine runs can reference their slugs. The
-- full policy lives in the repo playbook.md files (keeper dirs are
-- filesystem-authored, like keeper-people-records); procedure_md here is a
-- pointer summary, definition is empty until a typed engine executes these
-- record types (same pattern as keeper-entity-notes, 20260626160000).
-- ============================================================================

INSERT INTO public.playbook_blueprints (
  slug, name, player_slug, description, kind, procedure_md, definition
)
VALUES
  (
    'keeper-billing-records',
    'Billing Records',
    'keeper',
    'Maintain durable billing records from payment evidence, document extraction, counterparty context, and connected finance tools.',
    'profile',
    '# Billing Records

Policy canon: app/_features/plays/playbooks/keeper-billing-records/playbook.md and brand-identity/product-internal/features/keeper-field-contracts.md (Billing section). Status transitions auto-apply only on hard payment evidence; refunds/disputes are always ask-first; Salt-drafted invoices stay drafts (auto_advance pinned false).',
    '{}'::jsonb
  ),
  (
    'keeper-meetings-records',
    'Meetings Records',
    'keeper',
    'Maintain durable meeting records from calendar evidence, attendee context, and captured meeting artifacts.',
    'profile',
    '# Meetings Records

Policy canon: app/_features/plays/playbooks/keeper-meetings-records/playbook.md. Calendar-sourced facts auto-apply (the calendar is the source of truth); meeting-type inference and no-show are ask-first; Salt-authored summaries never overwrite user edits.',
    '{}'::jsonb
  ),
  (
    'keeper-files-records',
    'Files Records',
    'keeper',
    'Maintain durable file records: classification, lifecycle, dates, amounts, and attachment links from source context.',
    'profile',
    '# Files Records

Policy canon: app/_features/plays/playbooks/keeper-files-records/playbook.md. Classification auto-applies above threshold; lifecycle transitions auto only from signature-platform evidence; kind is mime-derived and read-only; Salt never modifies file contents.',
    '{}'::jsonb
  ),
  (
    'keeper-me',
    'Me (Operator)',
    'keeper',
    'Maintain the operator''s own record through the proposed-to-confirmed operator memory fact loop; never write identity or business scalars directly.',
    'profile',
    '# Me (Operator)

Policy canon: app/_features/plays/playbooks/keeper-me/playbook.md. Everything routes through operator_memory_facts (proposed -> confirmed/revised/dismissed); dismissed facts are never re-proposed from the same evidence; goals are user-only with ai_progress system-derived.',
    '{}'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

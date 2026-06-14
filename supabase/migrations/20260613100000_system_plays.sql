-- ============================================================================
-- SYSTEM PLAYS: Immutable core operations for Salt
-- Migration: Create system_plays registry table
-- ============================================================================
--
-- System plays are the atomic operations that all user plays compose from.
-- They cannot be customized, deleted, or disabled by users. They are infrastructure.
--
-- Safety constraints:
-- - Entities: create, update, archive (NEVER delete — only humans can delete)
-- - Links: link, unlink (simple add/remove, no archive needed)
--
-- ============================================================================

-- Action types for system plays
CREATE TYPE public.system_play_action AS ENUM (
  'create',    -- Create a new entity
  'update',    -- Update entity fields
  'archive',   -- Set archived_at (entities only, never delete)
  'link',      -- Add graph edge (links only)
  'unlink',    -- Remove graph edge (links only)
  'attach',    -- Attach sub-entity (email, note, file)
  'classify'   -- Set classification (relationship type, etc.)
);

-- Target entity types
CREATE TYPE public.system_play_target AS ENUM (
  'person',
  'org',
  'work',
  'playbook',
  'player',
  'space',
  'note',
  'conversation',
  'email',
  'file'
);

-- ============================================================================
-- SYSTEM PLAYS REGISTRY
-- ============================================================================

CREATE TABLE public.system_plays (
  slug TEXT PRIMARY KEY,  -- e.g., 'system:create-person'
  name TEXT NOT NULL,
  description TEXT,
  target_entity public.system_play_target NOT NULL,
  action_type public.system_play_action NOT NULL,
  input_schema JSONB NOT NULL DEFAULT '{}',  -- Zod-compatible schema for inputs
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System plays are global (not workspace-scoped) and immutable
-- No RLS needed — they're read-only reference data

COMMENT ON TABLE public.system_plays IS 'Registry of immutable core operations. Salt can never delete entities — only archive. Links can be added/removed freely.';

-- ============================================================================
-- SEED SYSTEM PLAYS
-- ============================================================================

INSERT INTO public.system_plays (slug, name, description, target_entity, action_type, input_schema) VALUES
  -- Person operations
  ('system:create-person', 'Create Person', 'Create a new Person in Memory', 'person', 'create',
   '{"type": "object", "properties": {"name": {"type": "string"}, "email": {"type": "string"}, "relationship_type": {"type": "string"}}, "required": ["name"]}'),
  ('system:update-person', 'Update Person', 'Update Person fields', 'person', 'update',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "fields": {"type": "object"}}, "required": ["person_id", "fields"]}'),
  ('system:archive-person', 'Archive Person', 'Archive (never delete) a Person', 'person', 'archive',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "reason": {"type": "string"}}, "required": ["person_id"]}'),
  ('system:classify-person', 'Classify Person', 'Set relationship type (client, prospect, vendor, etc.)', 'person', 'classify',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "relationship_type": {"type": "string"}}, "required": ["person_id", "relationship_type"]}'),

  -- Org operations
  ('system:create-org', 'Create Org', 'Create a new Org in Memory', 'org', 'create',
   '{"type": "object", "properties": {"name": {"type": "string"}, "domain": {"type": "string"}}, "required": ["name"]}'),
  ('system:update-org', 'Update Org', 'Update Org fields', 'org', 'update',
   '{"type": "object", "properties": {"org_id": {"type": "string", "format": "uuid"}, "fields": {"type": "object"}}, "required": ["org_id", "fields"]}'),
  ('system:archive-org', 'Archive Org', 'Archive (never delete) an Org', 'org', 'archive',
   '{"type": "object", "properties": {"org_id": {"type": "string", "format": "uuid"}, "reason": {"type": "string"}}, "required": ["org_id"]}'),

  -- Work operations
  ('system:create-work', 'Create Work', 'Create a new Work/Project', 'work', 'create',
   '{"type": "object", "properties": {"name": {"type": "string"}, "person_id": {"type": "string", "format": "uuid"}, "org_id": {"type": "string", "format": "uuid"}}, "required": ["name"]}'),
  ('system:update-work', 'Update Work', 'Update Work fields', 'work', 'update',
   '{"type": "object", "properties": {"work_id": {"type": "string", "format": "uuid"}, "fields": {"type": "object"}}, "required": ["work_id", "fields"]}'),
  ('system:archive-work', 'Archive Work', 'Archive (never delete) a Work', 'work', 'archive',
   '{"type": "object", "properties": {"work_id": {"type": "string", "format": "uuid"}, "reason": {"type": "string"}}, "required": ["work_id"]}'),

  -- Playbook operations
  ('system:create-playbook', 'Create Playbook', 'Create a play template', 'playbook', 'create',
   '{"type": "object", "properties": {"name": {"type": "string"}, "player_id": {"type": "string", "format": "uuid"}, "procedure_md": {"type": "string"}}, "required": ["name"]}'),
  ('system:update-playbook', 'Update Playbook', 'Update play template', 'playbook', 'update',
   '{"type": "object", "properties": {"playbook_id": {"type": "string", "format": "uuid"}, "fields": {"type": "object"}}, "required": ["playbook_id", "fields"]}'),
  ('system:archive-playbook', 'Archive Playbook', 'Archive (never delete) a playbook', 'playbook', 'archive',
   '{"type": "object", "properties": {"playbook_id": {"type": "string", "format": "uuid"}, "reason": {"type": "string"}}, "required": ["playbook_id"]}'),

  -- Player operations
  ('system:create-player', 'Create Player', 'Create a player role', 'player', 'create',
   '{"type": "object", "properties": {"name": {"type": "string"}, "description": {"type": "string"}}, "required": ["name"]}'),
  ('system:update-player', 'Update Player', 'Update player role', 'player', 'update',
   '{"type": "object", "properties": {"player_id": {"type": "string", "format": "uuid"}, "fields": {"type": "object"}}, "required": ["player_id", "fields"]}'),
  ('system:archive-player', 'Archive Player', 'Archive (never delete) a player', 'player', 'archive',
   '{"type": "object", "properties": {"player_id": {"type": "string", "format": "uuid"}, "reason": {"type": "string"}}, "required": ["player_id"]}'),

  -- Space operations
  ('system:create-space', 'Create Space', 'Create a Space', 'space', 'create',
   '{"type": "object", "properties": {"name": {"type": "string"}, "type": {"type": "string"}}, "required": ["name"]}'),
  ('system:update-space', 'Update Space', 'Update Space fields', 'space', 'update',
   '{"type": "object", "properties": {"space_id": {"type": "string", "format": "uuid"}, "fields": {"type": "object"}}, "required": ["space_id", "fields"]}'),
  ('system:archive-space', 'Archive Space', 'Archive (never delete) a Space', 'space', 'archive',
   '{"type": "object", "properties": {"space_id": {"type": "string", "format": "uuid"}, "reason": {"type": "string"}}, "required": ["space_id"]}'),

  -- Note and conversation
  ('system:create-note', 'Create Note', 'Add note to any entity', 'note', 'create',
   '{"type": "object", "properties": {"content": {"type": "string"}, "target_type": {"type": "string"}, "target_id": {"type": "string", "format": "uuid"}}, "required": ["content", "target_type", "target_id"]}'),
  ('system:create-conversation', 'Create Conversation', 'Create conversation thread', 'conversation', 'create',
   '{"type": "object", "properties": {"subject": {"type": "string"}, "participants": {"type": "array", "items": {"type": "string", "format": "uuid"}}}, "required": ["subject"]}'),

  -- Attachments
  ('system:attach-email', 'Attach Email', 'Link email to entity', 'email', 'attach',
   '{"type": "object", "properties": {"email_id": {"type": "string", "format": "uuid"}, "target_type": {"type": "string"}, "target_id": {"type": "string", "format": "uuid"}}, "required": ["email_id", "target_type", "target_id"]}'),

  -- Links (graph edges) - Person
  ('system:link-person-org', 'Link Person to Org', 'Add edge: Person to Org', 'person', 'link',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "org_id": {"type": "string", "format": "uuid"}}, "required": ["person_id", "org_id"]}'),
  ('system:unlink-person-org', 'Unlink Person from Org', 'Remove edge: Person from Org', 'person', 'unlink',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "org_id": {"type": "string", "format": "uuid"}}, "required": ["person_id", "org_id"]}'),
  ('system:link-person-work', 'Link Person to Work', 'Add edge: Person to Work', 'person', 'link',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "work_id": {"type": "string", "format": "uuid"}}, "required": ["person_id", "work_id"]}'),
  ('system:unlink-person-work', 'Unlink Person from Work', 'Remove edge: Person from Work', 'person', 'unlink',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "work_id": {"type": "string", "format": "uuid"}}, "required": ["person_id", "work_id"]}'),
  ('system:link-person-person', 'Link Person to Person', 'Add edge: Person to Person', 'person', 'link',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "target_person_id": {"type": "string", "format": "uuid"}}, "required": ["person_id", "target_person_id"]}'),
  ('system:unlink-person-person', 'Unlink Person from Person', 'Remove edge: Person from Person', 'person', 'unlink',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "target_person_id": {"type": "string", "format": "uuid"}}, "required": ["person_id", "target_person_id"]}'),
  ('system:link-person-space', 'Link Person to Space', 'Add edge: Person to Space', 'person', 'link',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "space_id": {"type": "string", "format": "uuid"}}, "required": ["person_id", "space_id"]}'),
  ('system:unlink-person-space', 'Unlink Person from Space', 'Remove edge: Person from Space', 'person', 'unlink',
   '{"type": "object", "properties": {"person_id": {"type": "string", "format": "uuid"}, "space_id": {"type": "string", "format": "uuid"}}, "required": ["person_id", "space_id"]}'),

  -- Links (graph edges) - Org
  ('system:link-org-work', 'Link Org to Work', 'Add edge: Org to Work (client relationship)', 'org', 'link',
   '{"type": "object", "properties": {"org_id": {"type": "string", "format": "uuid"}, "work_id": {"type": "string", "format": "uuid"}}, "required": ["org_id", "work_id"]}'),
  ('system:unlink-org-work', 'Unlink Org from Work', 'Remove edge: Org from Work', 'org', 'unlink',
   '{"type": "object", "properties": {"org_id": {"type": "string", "format": "uuid"}, "work_id": {"type": "string", "format": "uuid"}}, "required": ["org_id", "work_id"]}'),

  -- Links (graph edges) - Work
  ('system:link-work-space', 'Link Work to Space', 'Add edge: Work to Space', 'work', 'link',
   '{"type": "object", "properties": {"work_id": {"type": "string", "format": "uuid"}, "space_id": {"type": "string", "format": "uuid"}}, "required": ["work_id", "space_id"]}'),
  ('system:unlink-work-space', 'Unlink Work from Space', 'Remove edge: Work from Space', 'work', 'unlink',
   '{"type": "object", "properties": {"work_id": {"type": "string", "format": "uuid"}, "space_id": {"type": "string", "format": "uuid"}}, "required": ["work_id", "space_id"]}');

-- Invariant: No system:delete-* plays exist. Only archive for entities, unlink for edges.

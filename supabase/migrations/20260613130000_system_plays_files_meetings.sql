-- ============================================================================
-- System Plays: Files and Meetings
-- ============================================================================
-- Adding missing system plays for File and Meeting entities.
-- These follow the same pattern: create, update, archive (never delete).
--
-- DEPENDS ON: 20260613125000_extend_system_play_target_enum.sql (must run first)

-- Files
INSERT INTO public.system_plays (slug, name, description, target_entity, action_type, input_schema) VALUES
  ('system:create-file', 'Create File', 'Create a File reference in Memory', 'file', 'create',
   '{"name": "string", "url": "string", "mime_type": "string?", "size_bytes": "number?", "source": "string?"}'),
  ('system:update-file', 'Update File', 'Update File metadata', 'file', 'update',
   '{"file_id": "uuid", "fields": "object"}'),
  ('system:archive-file', 'Archive File', 'Archive (never delete) a File', 'file', 'archive',
   '{"file_id": "uuid", "reason": "string?"}');

-- Meetings
INSERT INTO public.system_plays (slug, name, description, target_entity, action_type, input_schema) VALUES
  ('system:create-meeting', 'Create Meeting', 'Create a Meeting record', 'meeting', 'create',
   '{"title": "string", "start_at": "datetime", "end_at": "datetime?", "location": "string?", "calendar_id": "string?"}'),
  ('system:update-meeting', 'Update Meeting', 'Update Meeting fields', 'meeting', 'update',
   '{"meeting_id": "uuid", "fields": "object"}'),
  ('system:archive-meeting', 'Archive Meeting', 'Archive (never delete) a Meeting', 'meeting', 'archive',
   '{"meeting_id": "uuid", "reason": "string?"}');

-- File links
INSERT INTO public.system_plays (slug, name, description, target_entity, action_type, input_schema) VALUES
  ('system:link-file-person', 'Link File to Person', 'Add edge: File to Person', 'file', 'link',
   '{"file_id": "uuid", "person_id": "uuid"}'),
  ('system:unlink-file-person', 'Unlink File from Person', 'Remove edge: File from Person', 'file', 'unlink',
   '{"file_id": "uuid", "person_id": "uuid"}'),
  ('system:link-file-org', 'Link File to Org', 'Add edge: File to Org', 'file', 'link',
   '{"file_id": "uuid", "org_id": "uuid"}'),
  ('system:unlink-file-org', 'Unlink File from Org', 'Remove edge: File from Org', 'file', 'unlink',
   '{"file_id": "uuid", "org_id": "uuid"}'),
  ('system:link-file-work', 'Link File to Work', 'Add edge: File to Work', 'file', 'link',
   '{"file_id": "uuid", "work_id": "uuid"}'),
  ('system:unlink-file-work', 'Unlink File from Work', 'Remove edge: File from Work', 'file', 'unlink',
   '{"file_id": "uuid", "work_id": "uuid"}');

-- Meeting links
INSERT INTO public.system_plays (slug, name, description, target_entity, action_type, input_schema) VALUES
  ('system:link-meeting-person', 'Link Meeting to Person', 'Add edge: Meeting to Person (attendee)', 'meeting', 'link',
   '{"meeting_id": "uuid", "person_id": "uuid", "role": "string?"}'),
  ('system:unlink-meeting-person', 'Unlink Meeting from Person', 'Remove edge: Meeting from Person', 'meeting', 'unlink',
   '{"meeting_id": "uuid", "person_id": "uuid"}'),
  ('system:link-meeting-org', 'Link Meeting to Org', 'Add edge: Meeting to Org', 'meeting', 'link',
   '{"meeting_id": "uuid", "org_id": "uuid"}'),
  ('system:unlink-meeting-org', 'Unlink Meeting from Org', 'Remove edge: Meeting from Org', 'meeting', 'unlink',
   '{"meeting_id": "uuid", "org_id": "uuid"}'),
  ('system:link-meeting-work', 'Link Meeting to Work', 'Add edge: Meeting to Work/Project', 'meeting', 'link',
   '{"meeting_id": "uuid", "work_id": "uuid"}'),
  ('system:unlink-meeting-work', 'Unlink Meeting from Work', 'Remove edge: Meeting from Work', 'meeting', 'unlink',
   '{"meeting_id": "uuid", "work_id": "uuid"}');

-- Billing entities (invoices, payments) — these are read-mostly from external systems
-- but Salt can still create draft invoices or record payments
INSERT INTO public.system_plays (slug, name, description, target_entity, action_type, input_schema) VALUES
  ('system:create-invoice', 'Create Invoice', 'Create a draft invoice', 'invoice', 'create',
   '{"person_id": "uuid?", "org_id": "uuid?", "amount_cents": "number", "currency": "string", "description": "string?", "due_at": "datetime?"}'),
  ('system:update-invoice', 'Update Invoice', 'Update invoice fields (draft only)', 'invoice', 'update',
   '{"invoice_id": "uuid", "fields": "object"}'),
  ('system:archive-invoice', 'Archive Invoice', 'Archive (never delete) an invoice', 'invoice', 'archive',
   '{"invoice_id": "uuid", "reason": "string?"}'),
  ('system:record-payment', 'Record Payment', 'Record a payment received', 'payment', 'create',
   '{"person_id": "uuid?", "org_id": "uuid?", "invoice_id": "uuid?", "amount_cents": "number", "currency": "string", "paid_at": "datetime", "source": "string?"}');

-- Invoice/Payment links
INSERT INTO public.system_plays (slug, name, description, target_entity, action_type, input_schema) VALUES
  ('system:link-invoice-person', 'Link Invoice to Person', 'Add edge: Invoice to Person', 'invoice', 'link',
   '{"invoice_id": "uuid", "person_id": "uuid"}'),
  ('system:link-invoice-org', 'Link Invoice to Org', 'Add edge: Invoice to Org', 'invoice', 'link',
   '{"invoice_id": "uuid", "org_id": "uuid"}'),
  ('system:link-invoice-work', 'Link Invoice to Work', 'Add edge: Invoice to Work/Project', 'invoice', 'link',
   '{"invoice_id": "uuid", "work_id": "uuid"}');

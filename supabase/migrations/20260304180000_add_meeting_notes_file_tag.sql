-- ============================================================================
-- ADD MEETING NOTES FILE TAG
-- ============================================================================
-- Adds "Meeting Notes" as a system file tag for organizing meeting-related files
-- ============================================================================

INSERT INTO public.file_tags (id, studio_id, label, color, default_direction, is_system, display_order)
VALUES
  ('77777777-7777-7777-7777-777777777777', NULL, 'Meeting Notes', '#0ea5e9', 'internal', true, 7)
ON CONFLICT DO NOTHING;

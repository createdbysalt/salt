-- Add linked_file kind and additional providers for meeting_sources
-- Supports user-linked files (Figma, Notion, Dropbox, Loom, etc.)

-- Drop and recreate the kind constraint to add linked_file
ALTER TABLE public.meeting_sources
  DROP CONSTRAINT valid_kind;

ALTER TABLE public.meeting_sources
  ADD CONSTRAINT valid_kind CHECK (
    kind = ANY (ARRAY[
      'calendar_event',
      'recording',
      'transcript',
      'notes_doc',
      'manual_entry',
      'linked_file'
    ])
  );

-- Drop and recreate the provider constraint to add more file providers
ALTER TABLE public.meeting_sources
  DROP CONSTRAINT valid_provider;

ALTER TABLE public.meeting_sources
  ADD CONSTRAINT valid_provider CHECK (
    provider = ANY (ARRAY[
      'manual',
      'google-calendar',
      'zoom',
      'google-meet',
      'google-drive',
      'fireflies',
      'recall',
      'figma',
      'notion',
      'dropbox',
      'loom',
      'miro',
      'slack',
      'linear',
      'github',
      'other'
    ])
  );

-- Add display_name column for user-friendly file names
ALTER TABLE public.meeting_sources
  ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN public.meeting_sources.display_name IS 'User-friendly name for the linked file';
COMMENT ON COLUMN public.meeting_sources.kind IS 'Type of source: calendar_event, recording, transcript, notes_doc, manual_entry, linked_file';

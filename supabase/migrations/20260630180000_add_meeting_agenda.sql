-- ============================================================================
-- ADD: agenda JSONB column to client_meetings
-- ============================================================================
-- Stores meeting agenda items as structured JSON:
-- null = no agenda set (show template prompt)
-- [] = explicit "no agenda"
-- [{id, title, notes, order}] = agenda items
-- ============================================================================

ALTER TABLE public.client_meetings
ADD COLUMN IF NOT EXISTS agenda jsonb DEFAULT NULL;

COMMENT ON COLUMN public.client_meetings.agenda IS 'Structured agenda items: [{id: uuid, title: string, notes?: string, order: number}]. null = not set, [] = no agenda.';

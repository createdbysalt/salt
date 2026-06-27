-- Add note_suggestion finding type for Salt-authored notes that need review
ALTER TYPE public.finding_type ADD VALUE IF NOT EXISTS 'note_suggestion';

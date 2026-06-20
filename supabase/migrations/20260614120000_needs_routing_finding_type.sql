-- Allow findings that ask the user to route an important signal to a profile.
-- Enum value must be committed before the constraint can reference it (55P04).

ALTER TYPE public.finding_type ADD VALUE IF NOT EXISTS 'needs_routing';

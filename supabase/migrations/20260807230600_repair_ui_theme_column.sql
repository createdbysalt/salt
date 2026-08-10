-- Repair: add ui_theme column and constraint if missing (schema drift fix)
-- This column was added in 20251231000000_add_ui_theme_preferences.sql but
-- that migration didn't reach production.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_theme text NOT NULL DEFAULT 'dark';

-- Add constraint if not exists (matches original migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_ui_theme'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT valid_ui_theme CHECK (ui_theme IN ('light', 'dark', 'system'));
  END IF;
END $$;

-- Index for faster theme queries
CREATE INDEX IF NOT EXISTS profiles_ui_theme_idx ON public.profiles(ui_theme);

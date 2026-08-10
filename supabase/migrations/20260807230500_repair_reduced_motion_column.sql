-- Repair: add UI theme preference columns if missing (schema drift fix)
-- These columns were added in 20251231000000_add_ui_theme_preferences.sql but
-- that migration didn't reach production. Adding idempotently here so
-- subsequent migrations can proceed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_theme text NOT NULL DEFAULT 'system';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reduced_motion boolean NOT NULL DEFAULT false;

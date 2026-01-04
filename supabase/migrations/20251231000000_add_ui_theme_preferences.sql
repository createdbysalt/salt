-- ============================================================================
-- ADD UI THEME PREFERENCES TO PROFILES
-- Adds theme mode (dark/light) and reduced motion preference
-- ============================================================================

-- Add ui_theme column (default dark as per design system spec)
alter table public.profiles
  add column if not exists ui_theme text not null default 'dark';

-- Add reduced_motion preference column
alter table public.profiles
  add column if not exists reduced_motion boolean not null default false;

-- Add constraint to ensure valid theme values
alter table public.profiles
  add constraint valid_ui_theme check (ui_theme in ('light', 'dark'));

-- Users can already update their own profile via existing RLS policy
-- No additional policy changes needed

-- Index for faster theme queries (optional but helpful)
create index if not exists profiles_ui_theme_idx on public.profiles(ui_theme);





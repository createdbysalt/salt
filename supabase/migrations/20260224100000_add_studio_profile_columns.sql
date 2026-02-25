-- ============================================================================
-- Add Studio Profile Columns
-- ============================================================================
-- Adds profile fields to studios table: tagline, description, website_url,
-- team_size, founded_year, and social_links JSONB for social media handles.
-- ============================================================================

-- Add profile columns to studios table
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS team_size text CHECK (team_size IN ('solo', '2-5', '6-10', '11-25', '25+')),
ADD COLUMN IF NOT EXISTS founded_year integer CHECK (founded_year >= 1900 AND founded_year <= 2100),
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- Add settings JSONB column for extensible studio settings (client billing, etc.)
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- Create index for settings queries
CREATE INDEX IF NOT EXISTS studios_settings_idx ON public.studios USING gin(settings);

-- Comment on columns for documentation
COMMENT ON COLUMN public.studios.tagline IS 'Short phrase that captures what the studio does (max 140 chars)';
COMMENT ON COLUMN public.studios.description IS 'Full description of the studio for potential clients (max 1000 chars)';
COMMENT ON COLUMN public.studios.website_url IS 'Studio website URL';
COMMENT ON COLUMN public.studios.team_size IS 'Team size category: solo, 2-5, 6-10, 11-25, 25+';
COMMENT ON COLUMN public.studios.founded_year IS 'Year the studio was founded';
COMMENT ON COLUMN public.studios.social_links IS 'JSONB object with social media handles: {x, linkedin, instagram, youtube, behance, dribbble, tiktok, vimeo, github}';
COMMENT ON COLUMN public.studios.settings IS 'JSONB for extensible settings like client_billing preferences';

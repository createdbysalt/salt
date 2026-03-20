-- ============================================================================
-- Add Contact Fields to Profiles
-- ============================================================================
-- Adds phone, company, job title, timezone, and contact preference fields
-- for Bridge (client portal) account settings.
-- ============================================================================

-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS preferred_contact_method text DEFAULT 'email'
  CHECK (preferred_contact_method IN ('email', 'phone', 'portal'));

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for contact';
COMMENT ON COLUMN public.profiles.company_name IS 'Company or organization name';
COMMENT ON COLUMN public.profiles.job_title IS 'Job title or role';
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone (IANA format)';
COMMENT ON COLUMN public.profiles.preferred_contact_method IS 'Preferred method of contact: email, phone, or portal';

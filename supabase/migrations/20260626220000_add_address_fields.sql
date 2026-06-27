-- Add address fields to people and organizations for invoicing

-- People address fields
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Organizations address fields + tax ID
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- Comments for documentation
COMMENT ON COLUMN public.people.address_line_1 IS 'Street address line 1';
COMMENT ON COLUMN public.people.address_line_2 IS 'Street address line 2 (apt, suite, etc.)';
COMMENT ON COLUMN public.people.city IS 'City';
COMMENT ON COLUMN public.people.state IS 'State or province';
COMMENT ON COLUMN public.people.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN public.people.country IS 'Country';

COMMENT ON COLUMN public.organizations.address_line_1 IS 'Street address line 1';
COMMENT ON COLUMN public.organizations.address_line_2 IS 'Street address line 2 (apt, suite, etc.)';
COMMENT ON COLUMN public.organizations.city IS 'City';
COMMENT ON COLUMN public.organizations.state IS 'State or province';
COMMENT ON COLUMN public.organizations.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN public.organizations.country IS 'Country';
COMMENT ON COLUMN public.organizations.tax_id IS 'Tax ID / VAT number for invoicing';

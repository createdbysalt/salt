-- Add new identity fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female') OR gender IS NULL),
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS professional_credentials TEXT;

-- Add new business fields to workspaces table
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS legal_business_name TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT CHECK (business_type IN ('sole_proprietor', 'llc', 'corporation', 'partnership', 'nonprofit') OR business_type IS NULL),
  ADD COLUMN IF NOT EXISTS legal_address TEXT,
  ADD COLUMN IF NOT EXISTS business_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_email TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_type TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_last4 TEXT CHECK (char_length(tax_id_last4) <= 4),
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Comments
COMMENT ON COLUMN public.profiles.phone IS 'Contact phone number for invoices/proposals';
COMMENT ON COLUMN public.profiles.gender IS 'Gender for AI correspondence (male/female/null)';
COMMENT ON COLUMN public.profiles.preferred_name IS 'Name the operator prefers to be called (may differ from legal name)';
COMMENT ON COLUMN public.profiles.professional_credentials IS 'Professional credentials/certifications (e.g., CPA, PMP)';

COMMENT ON COLUMN public.workspaces.legal_business_name IS 'Legal business name for contracts/invoices (may differ from brand name)';
COMMENT ON COLUMN public.workspaces.business_type IS 'Business structure: sole_proprietor, llc, corporation, partnership, nonprofit';
COMMENT ON COLUMN public.workspaces.legal_address IS 'Legal address for contracts and invoices';
COMMENT ON COLUMN public.workspaces.business_phone IS 'Customer-facing business phone';
COMMENT ON COLUMN public.workspaces.business_email IS 'Customer-facing business email for invoices/proposals';
COMMENT ON COLUMN public.workspaces.tax_id_type IS 'Type of tax ID: EIN, VAT, ABN, GST, etc.';
COMMENT ON COLUMN public.workspaces.tax_id_last4 IS 'Last 4 digits of tax ID for display (never store full ID)';
COMMENT ON COLUMN public.workspaces.industry IS 'Business industry for categorization and AI context';
COMMENT ON COLUMN public.workspaces.default_currency IS 'Default currency for invoicing (ISO 4217)';
COMMENT ON COLUMN public.workspaces.payment_terms IS 'Default payment terms (e.g., Net 15, Net 30, Due on receipt)';

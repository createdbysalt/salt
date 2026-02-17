-- Migration: Add client_type column to clients table
-- This allows distinguishing between individual clients and organization clients

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'individual'
  CHECK (client_type IN ('individual', 'organization'));

COMMENT ON COLUMN public.clients.client_type IS 'Whether this client record represents an individual person or an organization/company';

-- Set existing clients based on whether they have a company association
-- If they have a company_id, they're still "individual" (person at a company)
-- Only clients where the name matches company name pattern would be organizations
UPDATE public.clients
SET client_type = 'individual'
WHERE client_type IS NULL;

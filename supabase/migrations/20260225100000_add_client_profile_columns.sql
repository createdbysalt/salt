-- Add company_name and notes columns to clients table for profile editing
-- These columns allow storing additional client information

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Add comments for documentation
COMMENT ON COLUMN public.clients.company_name IS 'Company or organization name for this client';
COMMENT ON COLUMN public.clients.notes IS 'Internal notes about this client (not visible to client)';

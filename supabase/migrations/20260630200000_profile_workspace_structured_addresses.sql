-- Structured addresses for operator profile (About You) and workspace legal address

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS legal_address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS legal_address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS legal_city TEXT,
  ADD COLUMN IF NOT EXISTS legal_state TEXT,
  ADD COLUMN IF NOT EXISTS legal_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS legal_country TEXT;

-- Backfill legacy single-line legal_address into structured line 1
UPDATE public.workspaces
SET legal_address_line_1 = legal_address
WHERE legal_address IS NOT NULL
  AND TRIM(legal_address) <> ''
  AND (legal_address_line_1 IS NULL OR TRIM(legal_address_line_1) = '');

COMMENT ON COLUMN public.profiles.address_line_1 IS 'Operator mailing address line 1';
COMMENT ON COLUMN public.workspaces.legal_address_line_1 IS 'Legal business address line 1 for contracts and invoices';

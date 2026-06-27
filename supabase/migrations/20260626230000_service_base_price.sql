-- Add base_price_cents to workspace_services for cents-based pricing consistency
-- Supplements existing price_min/price_max (decimal dollars) with a single base price in cents

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS base_price_cents BIGINT;

COMMENT ON COLUMN public.workspace_services.base_price_cents IS 'Base price for this service in cents. Used as default when linking to work.';

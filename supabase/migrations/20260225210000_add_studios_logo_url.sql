-- ============================================================================
-- Add logo_url column to studios table
-- ============================================================================
-- The useStudioProfile hook expects this column but it was never added.
-- ============================================================================

ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.studios.logo_url IS 'URL to the studio logo image';

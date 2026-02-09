-- ============================================================================
-- ADD BRIDGE BRANDING TO STUDIOS
-- Phase 1.1 of White-Label Foundation
-- ============================================================================

-- Add bridge_branding JSONB column to studios table
-- This stores logo, favicon, colors, and footer customization for Bridge
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS bridge_branding jsonb DEFAULT '{}';

-- Add comment documenting the structure
COMMENT ON COLUMN public.studios.bridge_branding IS 'Bridge white-label branding configuration. Structure:
{
  "logo": { "lightUrl": string, "darkUrl": string, "width": number, "height": number },
  "favicon": { "url": string },
  "colors": { "accent": string, "accentForeground": string },
  "footer": { "showPoweredBy": boolean, "customText": string | null }
}';

-- Create storage bucket for branding assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bridge-branding',
  'bridge-branding',
  true,
  2097152, -- 2MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for bridge-branding bucket
-- Studio members can manage their studio's branding assets
-- Assets are stored in folders named by studio_id
CREATE POLICY "studio_members_manage_branding_assets"
ON storage.objects FOR ALL
USING (
  bucket_id = 'bridge-branding'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'bridge-branding'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Public read access for branding assets (they need to be visible in Bridge)
CREATE POLICY "public_read_branding_assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'bridge-branding');

-- ============================================================================
-- Migration: Create studio_services table with Stripe Sync columns
-- Purpose: Service catalog with Phase 2 Stripe Products/Prices sync preparation
-- Pattern: Full table creation with all columns ready for Stripe integration
-- ============================================================================

-- Create the studio_services table
CREATE TABLE IF NOT EXISTS public.studio_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Service info
  name text NOT NULL,
  description text,
  category text,
  pricing_type text CHECK (pricing_type IN ('fixed', 'hourly', 'retainer', 'custom')),
  price_min numeric(10,2),
  price_max numeric(10,2),
  currency text DEFAULT 'USD',
  deliverables text[] DEFAULT '{}',
  typical_timeline text,
  ai_description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,

  -- Stripe sync (Phase 2)
  stripe_product_id text,
  stripe_price_id text,
  stripe_sync_status text DEFAULT 'not_synced'
    CHECK (stripe_sync_status IN ('not_synced', 'synced', 'sync_error', 'pending')),
  stripe_synced_at timestamptz,

  -- Tag references (links to studio_tags)
  feature_tag_ids uuid[] DEFAULT '{}',
  deliverable_tag_ids uuid[] DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD'))
);

-- Add Stripe/tag columns when studio_services was created by an earlier migration.
ALTER TABLE public.studio_services
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_sync_status text DEFAULT 'not_synced',
  ADD COLUMN IF NOT EXISTS stripe_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS feature_tag_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deliverable_tag_ids uuid[] DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'studio_services_stripe_sync_status_check'
      AND conrelid = 'public.studio_services'::regclass
  ) THEN
    ALTER TABLE public.studio_services
    ADD CONSTRAINT studio_services_stripe_sync_status_check
    CHECK (stripe_sync_status IN ('not_synced', 'synced', 'sync_error', 'pending'));
  END IF;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_studio_services_studio ON public.studio_services(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_services_active ON public.studio_services(studio_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_studio_services_stripe_product
  ON public.studio_services(stripe_product_id)
  WHERE stripe_product_id IS NOT NULL;

-- RLS
ALTER TABLE public.studio_services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "studio_members_view_services" ON public.studio_services;
DROP POLICY IF EXISTS "studio_members_manage_services" ON public.studio_services;

CREATE POLICY "studio_members_view_services" ON public.studio_services
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "studio_members_manage_services" ON public.studio_services
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- Comments
COMMENT ON TABLE public.studio_services IS 'Service offerings catalog - used for proposals, billing, and AI context';
COMMENT ON COLUMN public.studio_services.ai_description IS 'Optimized description for AI proposal generation';
COMMENT ON COLUMN public.studio_services.deliverables IS 'Array of deliverable items included in this service';
COMMENT ON COLUMN public.studio_services.stripe_product_id IS 'Stripe Product ID when synced';
COMMENT ON COLUMN public.studio_services.stripe_price_id IS 'Stripe Price ID for default price';
COMMENT ON COLUMN public.studio_services.stripe_sync_status IS 'Sync status: not_synced, synced, sync_error, pending';
COMMENT ON COLUMN public.studio_services.stripe_synced_at IS 'Last successful sync timestamp';
COMMENT ON COLUMN public.studio_services.feature_tag_ids IS 'Array of studio_tags IDs (type=feature)';
COMMENT ON COLUMN public.studio_services.deliverable_tag_ids IS 'Array of studio_tags IDs (type=deliverable)';

-- Updated at trigger
DROP TRIGGER IF EXISTS update_studio_services_updated_at ON public.studio_services;
CREATE TRIGGER update_studio_services_updated_at
  BEFORE UPDATE ON public.studio_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Seed function for default service templates
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_default_services(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO studio_services (
    studio_id, name, description, category, pricing_type,
    price_min, price_max, currency, typical_timeline, display_order, is_active
  ) VALUES
    -- Web Design & Development
    (p_studio_id, 'Landing Page', 'High-converting single page website with responsive design', 'Web Design', 'fixed', 1500, 3000, 'USD', '1-2 weeks', 1, true),
    (p_studio_id, 'Business Website', 'Full multi-page website with CMS integration', 'Web Design', 'fixed', 5000, 15000, 'USD', '4-8 weeks', 2, true),
    (p_studio_id, 'E-commerce Store', 'Online store with payment processing and inventory', 'Web Design', 'fixed', 8000, 25000, 'USD', '6-12 weeks', 3, true),
    (p_studio_id, 'Web Application', 'Custom web app with user authentication and database', 'Web Design', 'fixed', 15000, 50000, 'USD', '8-16 weeks', 4, true),

    -- Branding
    (p_studio_id, 'Logo Design', 'Custom logo with variations and brand mark', 'Branding', 'fixed', 500, 2000, 'USD', '1-2 weeks', 5, true),
    (p_studio_id, 'Brand Identity', 'Complete brand system: logo, colors, typography, guidelines', 'Branding', 'fixed', 3000, 10000, 'USD', '3-6 weeks', 6, true),

    -- Retainer Services
    (p_studio_id, 'Design Retainer', 'Ongoing design support with dedicated hours', 'Retainer', 'retainer', 2000, 5000, 'USD', 'Monthly', 7, true),
    (p_studio_id, 'Development Retainer', 'Ongoing development and maintenance support', 'Retainer', 'retainer', 3000, 8000, 'USD', 'Monthly', 8, true),

    -- Hourly Services
    (p_studio_id, 'Design Consultation', 'Expert design advice and feedback sessions', 'Consulting', 'hourly', 150, 250, 'USD', 'Per hour', 9, true),
    (p_studio_id, 'Technical Consultation', 'Architecture review, code audit, technical guidance', 'Consulting', 'hourly', 200, 350, 'USD', 'Per hour', 10, true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

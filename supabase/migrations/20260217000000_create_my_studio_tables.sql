-- ============================================================================
-- CREATE: My Studio Hub Tables
-- ============================================================================
-- Centralizes studio-level configuration for AI features and studio management.
-- Tables: studio_brand_config, studio_services, studio_portfolio,
--         contract_templates, studio_email_templates, studio_project_types
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD STUDIO PROFILE COLUMNS
-- ============================================================================

ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS founded_year integer;

COMMENT ON COLUMN public.studios.tagline IS 'Short tagline for the studio (max 140 chars)';
COMMENT ON COLUMN public.studios.description IS 'Full description of the studio for AI context';
COMMENT ON COLUMN public.studios.website_url IS 'Studio website URL';
COMMENT ON COLUMN public.studios.social_links IS 'Social media links: { twitter, linkedin, instagram, etc. }';
COMMENT ON COLUMN public.studios.team_size IS 'Team size description: solo, 2-5, 6-10, 11-25, 25+';
COMMENT ON COLUMN public.studios.founded_year IS 'Year the studio was founded';

-- ============================================================================
-- STEP 2: CREATE STUDIO_BRAND_CONFIG TABLE
-- ============================================================================
-- AI source of truth for brand voice and visual identity

CREATE TABLE public.studio_brand_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Colors (hex format)
  color_primary text,
  color_secondary text,
  color_neutral text,
  color_accent text,

  -- Typography
  font_heading text,
  font_body text,

  -- Brand voice (for AI generation)
  voice_tone text[] DEFAULT '{}',
  voice_style_guide text,
  voice_terminology jsonb DEFAULT '{"preferred": [], "avoid": []}'::jsonb,
  voice_sample_content text[] DEFAULT '{}',

  -- Logo variants
  logo_light_url text,
  logo_dark_url text,
  logo_icon_url text,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- One config per studio
  UNIQUE(studio_id)
);

-- Indexes
CREATE INDEX idx_studio_brand_config_studio ON public.studio_brand_config(studio_id);

-- RLS
ALTER TABLE public.studio_brand_config ENABLE ROW LEVEL SECURITY;

-- Studio members can view brand config
CREATE POLICY "studio_members_view_brand_config" ON public.studio_brand_config
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

-- Studio admins/owners can manage brand config
CREATE POLICY "studio_admins_manage_brand_config" ON public.studio_brand_config
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Comments
COMMENT ON TABLE public.studio_brand_config IS 'Studio brand configuration - AI source of truth for voice and visual identity';
COMMENT ON COLUMN public.studio_brand_config.voice_tone IS 'Array of tone descriptors: professional, warm, confident, etc.';
COMMENT ON COLUMN public.studio_brand_config.voice_terminology IS 'JSON with preferred and avoid terminology arrays for AI';

-- ============================================================================
-- STEP 3: CREATE STUDIO_SERVICES TABLE
-- ============================================================================
-- Service offerings catalog for proposals and AI context

CREATE TABLE public.studio_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Service info
  name text NOT NULL,
  description text,
  category text,

  -- Pricing
  pricing_type text CHECK (pricing_type IN ('fixed', 'hourly', 'retainer', 'custom')),
  price_min numeric(10,2),
  price_max numeric(10,2),
  currency text DEFAULT 'USD',

  -- Deliverables
  deliverables text[] DEFAULT '{}',
  typical_timeline text,

  -- AI metadata
  ai_description text,

  -- Display
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD'))
);

-- Indexes
CREATE INDEX idx_studio_services_studio ON public.studio_services(studio_id);
CREATE INDEX idx_studio_services_active ON public.studio_services(studio_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.studio_services ENABLE ROW LEVEL SECURITY;

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
COMMENT ON TABLE public.studio_services IS 'Service offerings catalog - used for proposals and AI context';
COMMENT ON COLUMN public.studio_services.ai_description IS 'Optimized description for AI proposal generation';
COMMENT ON COLUMN public.studio_services.deliverables IS 'Array of deliverable items included in this service';

-- ============================================================================
-- STEP 4: CREATE STUDIO_PORTFOLIO TABLE
-- ============================================================================
-- Case studies and portfolio pieces for proposals and social proof

CREATE TABLE public.studio_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Basic info
  title text NOT NULL,
  client_name text,
  project_type text,

  -- Content
  summary text,
  challenge text,
  solution text,
  results text,

  -- Media
  cover_image_url text,
  gallery_urls text[] DEFAULT '{}',

  -- Testimonial
  testimonial_quote text,
  testimonial_author text,
  testimonial_role text,

  -- AI metadata
  ai_summary text,
  skills_demonstrated text[] DEFAULT '{}',

  -- Display settings
  is_featured boolean DEFAULT false,
  is_public boolean DEFAULT true,
  display_order integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX idx_studio_portfolio_studio ON public.studio_portfolio(studio_id);
CREATE INDEX idx_studio_portfolio_featured ON public.studio_portfolio(studio_id, is_featured) WHERE is_featured = true;
CREATE INDEX idx_studio_portfolio_public ON public.studio_portfolio(studio_id, is_public) WHERE is_public = true;

-- RLS
ALTER TABLE public.studio_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_members_view_portfolio" ON public.studio_portfolio
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "studio_members_manage_portfolio" ON public.studio_portfolio
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- Comments
COMMENT ON TABLE public.studio_portfolio IS 'Portfolio case studies - used for proposals and client-facing showcase';
COMMENT ON COLUMN public.studio_portfolio.ai_summary IS 'Optimized summary for AI proposal social proof';
COMMENT ON COLUMN public.studio_portfolio.skills_demonstrated IS 'Array of skills/technologies for matching to proposals';

-- ============================================================================
-- STEP 5: CREATE CONTRACT_TEMPLATES TABLE
-- ============================================================================
-- Contract and agreement templates with variable support

CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Template info
  name text NOT NULL,
  description text,
  category text CHECK (category IN ('msa', 'sow', 'nda', 'retainer', 'custom')),

  -- Content
  content text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,

  -- Settings
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  UNIQUE(studio_id, name)
);

-- Indexes
CREATE INDEX idx_contract_templates_studio ON public.contract_templates(studio_id);
CREATE INDEX idx_contract_templates_category ON public.contract_templates(studio_id, category);

-- RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_members_view_contracts" ON public.contract_templates
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "studio_admins_manage_contracts" ON public.contract_templates
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Comments
COMMENT ON TABLE public.contract_templates IS 'Contract/agreement templates with variable support';
COMMENT ON COLUMN public.contract_templates.content IS 'Markdown content with {{variable}} placeholders';
COMMENT ON COLUMN public.contract_templates.variables IS 'Variable definitions: { name: { type, description, default } }';

-- ============================================================================
-- STEP 6: CREATE STUDIO_EMAIL_TEMPLATES TABLE
-- ============================================================================
-- Email templates for automated communications

CREATE TABLE public.studio_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Template info
  name text NOT NULL,
  trigger_type text NOT NULL,

  -- Content
  subject_template text NOT NULL,
  body_template text NOT NULL,

  -- Settings
  is_active boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- One template per trigger type per studio
  UNIQUE(studio_id, trigger_type),

  -- Valid trigger types
  CONSTRAINT valid_trigger_type CHECK (
    trigger_type IN (
      'proposal_sent',
      'proposal_accepted',
      'invoice_sent',
      'invoice_reminder',
      'invoice_overdue',
      'project_started',
      'project_complete',
      'milestone_complete',
      'welcome_client',
      'custom'
    )
  )
);

-- Indexes
CREATE INDEX idx_studio_email_templates_studio ON public.studio_email_templates(studio_id);
CREATE INDEX idx_studio_email_templates_trigger ON public.studio_email_templates(studio_id, trigger_type);

-- RLS
ALTER TABLE public.studio_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_members_view_email_templates" ON public.studio_email_templates
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "studio_admins_manage_email_templates" ON public.studio_email_templates
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Comments
COMMENT ON TABLE public.studio_email_templates IS 'Email templates for automated studio communications';
COMMENT ON COLUMN public.studio_email_templates.trigger_type IS 'Event that triggers this email';
COMMENT ON COLUMN public.studio_email_templates.body_template IS 'HTML template with {{variable}} placeholders';

-- ============================================================================
-- STEP 7: CREATE STUDIO_PROJECT_TYPES TABLE
-- ============================================================================
-- Standardized project types per studio

CREATE TABLE public.studio_project_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(studio_id, name)
);

-- Indexes
CREATE INDEX idx_studio_project_types_studio ON public.studio_project_types(studio_id);

-- RLS
ALTER TABLE public.studio_project_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_members_view_project_types" ON public.studio_project_types
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "studio_members_manage_project_types" ON public.studio_project_types
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- Comments
COMMENT ON TABLE public.studio_project_types IS 'Standardized project types for the studio';

-- ============================================================================
-- STEP 8: ADD UPDATED_AT TRIGGERS
-- ============================================================================

-- studio_brand_config
CREATE TRIGGER update_studio_brand_config_updated_at
  BEFORE UPDATE ON public.studio_brand_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- studio_services
CREATE TRIGGER update_studio_services_updated_at
  BEFORE UPDATE ON public.studio_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- studio_portfolio
CREATE TRIGGER update_studio_portfolio_updated_at
  BEFORE UPDATE ON public.studio_portfolio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- contract_templates
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- studio_email_templates
CREATE TRIGGER update_studio_email_templates_updated_at
  BEFORE UPDATE ON public.studio_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- studio_project_types
CREATE TRIGGER update_studio_project_types_updated_at
  BEFORE UPDATE ON public.studio_project_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- VERIFICATION CHECKLIST
-- ============================================================================
-- [check] Added profile columns to studios table
-- [check] Created studio_brand_config with colors, fonts, voice
-- [check] Created studio_services for service offerings
-- [check] Created studio_portfolio for case studies
-- [check] Created contract_templates for agreements
-- [check] Created studio_email_templates for automated emails
-- [check] Created studio_project_types for standardized types
-- [check] All tables have RLS enabled
-- [check] All tables have appropriate indexes
-- [check] All tables have updated_at triggers

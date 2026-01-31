-- Sprint 3: Revolutionary Intake System
-- Minimal effort for client, maximum insight for studio

-- =============================================================================
-- CLIENT INTAKES TABLE
-- =============================================================================
-- Stores intake form submissions with auto-discovered data and essential questions

CREATE TABLE IF NOT EXISTS public.client_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,

  -- Initial input (the only 2 fields client MUST provide)
  website_url text NOT NULL,
  primary_goal text NOT NULL,

  -- Contact info (optional, can be auto-discovered)
  contact_name text,
  contact_email text,
  contact_phone text,

  -- Auto-discovered data (populated by discovery engine)
  auto_discovery jsonb DEFAULT '{}'::jsonb,
  -- Structure: {
  --   company_name: string,
  --   industry: string,
  --   tech_stack: string[],
  --   estimated_traffic: { monthly: number, source: string },
  --   social_links: { platform: url }[],
  --   competitors: string[],
  --   visual_identity: { primary_colors: string[], fonts: string[] },
  --   content_tone: string,
  --   team_size_estimate: number,
  --   funding_status: string,
  --   clearbit_data: {...},
  --   builtwith_data: {...},
  --   scraped_data: {...}
  -- }

  discovery_status text DEFAULT 'pending'
    CHECK (discovery_status IN ('pending', 'processing', 'completed', 'partial', 'failed')),
  discovery_started_at timestamptz,
  discovery_completed_at timestamptz,
  discovery_error text,

  -- The 5 Essential Questions (what CAN'T be auto-discovered)
  -- 1. The Trigger: "What's happening right now that made this a priority?"
  trigger_response text,

  -- 2. Desired Future: "When this project succeeds, what's different about your business?"
  desired_future_response text,

  -- 3. Obstacles: "What's tried before or considered? What made you hesitate?"
  obstacles_response text,

  -- 4. Decision Process: "Besides you, who else will weigh in on this decision?"
  decision_process_response text,

  -- 5. Anti-Goal: "What would make this project a failure even if we hit every deadline?"
  anti_goal_response text,

  -- Additional context
  additional_notes text,
  attachments text[] DEFAULT '{}',
  budget_range text, -- e.g., "$5k-10k", "$10k-25k", "$25k-50k", "$50k+"
  timeline text, -- e.g., "ASAP", "1-2 months", "3-6 months", "flexible"

  -- Brand snapshot (generated reciprocity deliverable)
  brand_snapshot jsonb DEFAULT '{}'::jsonb,
  brand_snapshot_generated_at timestamptz,

  -- Workflow status
  status text DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'reviewing', 'scheduled', 'converted', 'declined', 'archived')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,

  -- Conversion tracking
  converted_to_client_at timestamptz,
  declined_reason text,

  -- Metadata
  submitted_at timestamptz,
  ip_address inet,
  user_agent text,
  referral_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  -- Form progress (for resumable forms)
  form_progress jsonb DEFAULT '{}'::jsonb,
  last_activity_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for client_intakes
CREATE INDEX IF NOT EXISTS client_intakes_studio_idx ON public.client_intakes(studio_id);
CREATE INDEX IF NOT EXISTS client_intakes_client_idx ON public.client_intakes(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS client_intakes_status_idx ON public.client_intakes(studio_id, status);
CREATE INDEX IF NOT EXISTS client_intakes_discovery_status_idx ON public.client_intakes(discovery_status) WHERE discovery_status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS client_intakes_submitted_idx ON public.client_intakes(studio_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS client_intakes_website_idx ON public.client_intakes(website_url);

-- =============================================================================
-- DISCOVERY CACHE TABLE
-- =============================================================================
-- Caches auto-discovery results to avoid re-fetching for same domains

CREATE TABLE IF NOT EXISTS public.discovery_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_domain text NOT NULL UNIQUE,

  -- Cached data by source
  clearbit_data jsonb,
  clearbit_fetched_at timestamptz,

  builtwith_data jsonb,
  builtwith_fetched_at timestamptz,

  similarweb_data jsonb,
  similarweb_fetched_at timestamptz,

  scraped_data jsonb,
  scraped_fetched_at timestamptz,

  -- Merged/processed result
  merged_data jsonb,

  -- Freshness tracking
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for discovery_cache
CREATE INDEX IF NOT EXISTS discovery_cache_domain_idx ON public.discovery_cache(url_domain);
CREATE INDEX IF NOT EXISTS discovery_cache_expires_idx ON public.discovery_cache(expires_at) WHERE expires_at < now();

-- =============================================================================
-- KNOWLEDGE ITEMS TABLE
-- =============================================================================
-- Stores all knowledge about a client (intake responses, notes, transcripts, docs)

CREATE TABLE IF NOT EXISTS public.knowledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Content
  type text NOT NULL CHECK (type IN (
    'intake_response',    -- From intake form
    'discovery_note',     -- From discovery call
    'meeting_transcript', -- From recorded meetings
    'document',           -- Uploaded documents
    'link',               -- External links
    'insight',            -- AI-generated insights
    'decision',           -- Recorded decisions
    'feedback',           -- Client feedback
    'asset'               -- Brand assets, files
  )),

  title text NOT NULL,
  content text,
  rich_content jsonb, -- For structured content (e.g., meeting notes with timestamps)

  -- Source linking
  source_intake_id uuid REFERENCES public.client_intakes(id) ON DELETE SET NULL,
  source_url text,
  source_file_path text, -- For uploaded documents

  -- Organization
  tags text[] DEFAULT '{}',
  category text, -- e.g., 'brand', 'technical', 'business', 'design'
  is_pinned boolean DEFAULT false,
  is_private boolean DEFAULT false, -- Hidden from client portal

  -- AI-generated enhancements
  ai_summary text,
  ai_insights jsonb,
  ai_generated_at timestamptz,

  -- Embeddings for semantic search (future)
  embedding vector(1536), -- OpenAI ada-002 dimensions

  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for knowledge_items
CREATE INDEX IF NOT EXISTS knowledge_items_studio_idx ON public.knowledge_items(studio_id);
CREATE INDEX IF NOT EXISTS knowledge_items_client_idx ON public.knowledge_items(client_id);
CREATE INDEX IF NOT EXISTS knowledge_items_type_idx ON public.knowledge_items(client_id, type);
CREATE INDEX IF NOT EXISTS knowledge_items_pinned_idx ON public.knowledge_items(client_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS knowledge_items_tags_idx ON public.knowledge_items USING gin(tags);
CREATE INDEX IF NOT EXISTS knowledge_items_created_idx ON public.knowledge_items(client_id, created_at DESC);

-- =============================================================================
-- INTAKE FORM TEMPLATES TABLE
-- =============================================================================
-- Allows studios to customize their intake questions

CREATE TABLE IF NOT EXISTS public.intake_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  name text NOT NULL DEFAULT 'Default',
  description text,
  is_default boolean DEFAULT false,

  -- Customizable questions (extend the 5 essentials)
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Structure: [{
  --   id: string,
  --   type: 'text' | 'textarea' | 'select' | 'multiselect' | 'scale',
  --   question: string,
  --   placeholder: string,
  --   required: boolean,
  --   options: string[] (for select/multiselect),
  --   order: number
  -- }]

  -- Branding
  welcome_message text,
  thank_you_message text,
  logo_url text,
  accent_color text,

  -- Settings
  show_brand_snapshot boolean DEFAULT true,
  require_contact_info boolean DEFAULT true,
  collect_budget boolean DEFAULT true,
  collect_timeline boolean DEFAULT true,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(studio_id, name)
);

-- Indexes for intake_templates
CREATE INDEX IF NOT EXISTS intake_templates_studio_idx ON public.intake_templates(studio_id);
CREATE INDEX IF NOT EXISTS intake_templates_default_idx ON public.intake_templates(studio_id, is_default) WHERE is_default = true;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE public.client_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_templates ENABLE ROW LEVEL SECURITY;

-- CLIENT INTAKES POLICIES
-- Studio members can view their intakes
CREATE POLICY "studio_members_view_intakes" ON public.client_intakes
FOR SELECT TO authenticated
USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);

-- Studio members can manage their intakes
CREATE POLICY "studio_members_manage_intakes" ON public.client_intakes
FOR ALL TO authenticated
USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);

-- Public can submit intakes (anonymous submissions)
CREATE POLICY "public_submit_intakes" ON public.client_intakes
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- DISCOVERY CACHE POLICIES
-- Authenticated users can read cache (shared across studios for efficiency)
CREATE POLICY "authenticated_read_discovery_cache" ON public.discovery_cache
FOR SELECT TO authenticated
USING (true);

-- Service role manages cache (no direct user writes)
-- Note: Cache writes happen via service role in server actions

-- KNOWLEDGE ITEMS POLICIES
-- Studio members can view their knowledge items
CREATE POLICY "studio_members_view_knowledge" ON public.knowledge_items
FOR SELECT TO authenticated
USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);

-- Studio members can manage their knowledge items
CREATE POLICY "studio_members_manage_knowledge" ON public.knowledge_items
FOR ALL TO authenticated
USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);

-- Client users can view non-private knowledge items for their client
CREATE POLICY "client_users_view_knowledge" ON public.knowledge_items
FOR SELECT TO authenticated
USING (
  NOT is_private AND
  client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
);

-- INTAKE TEMPLATES POLICIES
-- Studio members can view their templates
CREATE POLICY "studio_members_view_templates" ON public.intake_templates
FOR SELECT TO authenticated
USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);

-- Studio admins can manage templates
CREATE POLICY "studio_admins_manage_templates" ON public.intake_templates
FOR ALL TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_client_intakes_updated_at ON public.client_intakes;
CREATE TRIGGER update_client_intakes_updated_at
  BEFORE UPDATE ON public.client_intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_discovery_cache_updated_at ON public.discovery_cache;
CREATE TRIGGER update_discovery_cache_updated_at
  BEFORE UPDATE ON public.discovery_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_items_updated_at ON public.knowledge_items;
CREATE TRIGGER update_knowledge_items_updated_at
  BEFORE UPDATE ON public.knowledge_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_intake_templates_updated_at ON public.intake_templates;
CREATE TRIGGER update_intake_templates_updated_at
  BEFORE UPDATE ON public.intake_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.client_intakes IS 'Client intake form submissions with auto-discovered data and essential questions';
COMMENT ON TABLE public.discovery_cache IS 'Cache for auto-discovery API results (Clearbit, BuiltWith, etc.)';
COMMENT ON TABLE public.knowledge_items IS 'Knowledge base items for clients (notes, documents, insights, etc.)';
COMMENT ON TABLE public.intake_templates IS 'Customizable intake form templates per studio';

COMMENT ON COLUMN public.client_intakes.auto_discovery IS 'JSON blob of all auto-discovered company data';
COMMENT ON COLUMN public.client_intakes.brand_snapshot IS 'Generated brand snapshot delivered to client as immediate value';
COMMENT ON COLUMN public.client_intakes.trigger_response IS 'Answer to: What made this a priority right now?';
COMMENT ON COLUMN public.client_intakes.desired_future_response IS 'Answer to: When successful, what is different?';
COMMENT ON COLUMN public.client_intakes.obstacles_response IS 'Answer to: What has been tried before?';
COMMENT ON COLUMN public.client_intakes.decision_process_response IS 'Answer to: Who else weighs in on this?';
COMMENT ON COLUMN public.client_intakes.anti_goal_response IS 'Answer to: What would make this a failure?';

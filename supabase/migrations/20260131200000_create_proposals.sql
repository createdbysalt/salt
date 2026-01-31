-- ============================================================================
-- CREATE: proposals and proposal_templates tables
-- ============================================================================
-- Powers the proposal/contract workflow with e-signature audit trail.
-- Includes payment tracking integration with Stripe.
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE NANOID FUNCTION FOR PUBLIC IDS
-- ============================================================================

-- Create a function to generate nanoid-like public IDs (21 chars, URL-safe)
CREATE OR REPLACE FUNCTION public.generate_nanoid(size int DEFAULT 21)
RETURNS text AS $$
DECLARE
  alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  idBuilder text := '';
  i int := 0;
  bytes bytea;
BEGIN
  bytes := gen_random_bytes(size);
  WHILE i < size LOOP
    idBuilder := idBuilder || substr(alphabet, (get_byte(bytes, i) % 62) + 1, 1);
    i := i + 1;
  END LOOP;
  RETURN idBuilder;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================================================
-- STEP 2: CREATE PROPOSAL_TEMPLATES TABLE
-- ============================================================================
-- Must be created first since proposals references it

CREATE TABLE public.proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Template info
  name text NOT NULL,
  description text,
  content jsonb DEFAULT '{}'::jsonb,
  default_terms jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  UNIQUE(studio_id, name)
);

-- Indexes for proposal_templates
CREATE INDEX idx_proposal_templates_studio ON public.proposal_templates(studio_id);

-- ============================================================================
-- STEP 3: CREATE PROPOSALS TABLE
-- ============================================================================

CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  intake_id uuid REFERENCES public.client_intakes(id) ON DELETE SET NULL,

  -- Public URL ID (nanoid for short, URL-safe identifiers)
  public_id text NOT NULL DEFAULT public.generate_nanoid(21),

  -- Proposal content
  title text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  template_id uuid REFERENCES public.proposal_templates(id) ON DELETE SET NULL,

  -- Pricing
  total_amount numeric(10,2),
  currency text DEFAULT 'USD',
  payment_schedule jsonb DEFAULT '[]'::jsonb,
  -- Structure: [{ amount, due_date, description, status }]

  -- Terms
  terms jsonb DEFAULT '{}'::jsonb,
  -- Structure: { validity_days, payment_terms, cancellation_policy, ... }

  -- Status tracking
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  expires_at timestamptz,

  -- E-Signature audit trail (critical for legal defensibility)
  signature_name text,
  signature_email text,
  signature_ip inet,
  signature_user_agent text,
  signature_geolocation jsonb,
  -- Structure: { country, region, city, latitude, longitude }
  signed_at timestamptz,
  document_hash text, -- SHA-256 hash of proposal content at signing time
  terms_version text,
  consent_checkbox_text text,
  signing_link_id text,
  signing_session_id text,

  -- Payment tracking (Stripe integration)
  deposit_amount numeric(10,2),
  deposit_paid boolean DEFAULT false,
  deposit_paid_at timestamptz,
  stripe_payment_intent_id text,
  stripe_invoice_id text,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')
  ),
  CONSTRAINT valid_currency CHECK (
    currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')
  )
);

-- Indexes for proposals
CREATE INDEX idx_proposals_studio ON public.proposals(studio_id);
CREATE INDEX idx_proposals_client ON public.proposals(client_id);
CREATE INDEX idx_proposals_status ON public.proposals(studio_id, status);
CREATE UNIQUE INDEX idx_proposals_public_id ON public.proposals(public_id);
CREATE INDEX idx_proposals_intake ON public.proposals(intake_id) WHERE intake_id IS NOT NULL;

-- ============================================================================
-- STEP 4: CREATE ONBOARDING_CHECKLISTS TABLE
-- ============================================================================

CREATE TABLE public.onboarding_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,

  -- Checklist info
  template_name text,
  items jsonb DEFAULT '[]'::jsonb,
  -- Structure: [{ id, title, description, completed, completed_at, completed_by }]

  -- Status tracking
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT valid_onboarding_status CHECK (
    status IN ('pending', 'in_progress', 'completed')
  )
);

-- Indexes for onboarding_checklists
CREATE INDEX idx_onboarding_checklists_client ON public.onboarding_checklists(client_id);
CREATE INDEX idx_onboarding_checklists_studio_status ON public.onboarding_checklists(studio_id, status);
CREATE INDEX idx_onboarding_checklists_proposal ON public.onboarding_checklists(proposal_id) WHERE proposal_id IS NOT NULL;

-- ============================================================================
-- STEP 5: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES FOR PROPOSALS
-- ============================================================================

-- Studio members can manage proposals
CREATE POLICY "studio_members_manage_proposals" ON public.proposals
FOR ALL TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES FOR PROPOSAL_TEMPLATES
-- ============================================================================

-- Studio members can manage templates
CREATE POLICY "studio_members_manage_templates" ON public.proposal_templates
FOR ALL TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 8: CREATE RLS POLICIES FOR ONBOARDING_CHECKLISTS
-- ============================================================================

-- Studio members can manage onboarding checklists
CREATE POLICY "studio_members_manage_onboarding" ON public.onboarding_checklists
FOR ALL TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 9: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Proposal templates updated_at trigger
CREATE TRIGGER update_proposal_templates_updated_at
  BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Proposals updated_at trigger
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Onboarding checklists updated_at trigger
CREATE TRIGGER update_onboarding_checklists_updated_at
  BEFORE UPDATE ON public.onboarding_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 10: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.proposals IS 'Client proposals with e-signature audit trail and Stripe payment integration';
COMMENT ON TABLE public.proposal_templates IS 'Reusable proposal templates for studios';
COMMENT ON TABLE public.onboarding_checklists IS 'Client onboarding progress tracking checklists';

COMMENT ON COLUMN public.proposals.public_id IS 'Short, URL-safe identifier for public proposal URLs (nanoid format)';
COMMENT ON COLUMN public.proposals.document_hash IS 'SHA-256 hash of proposal content at signing time for audit trail';
COMMENT ON COLUMN public.proposals.signature_ip IS 'IP address captured at time of signature for legal audit trail';
COMMENT ON COLUMN public.proposals.signature_geolocation IS 'Geolocation data at signing: { country, region, city, latitude, longitude }';
COMMENT ON COLUMN public.proposals.content IS 'Structured proposal content as JSON';
COMMENT ON COLUMN public.proposals.payment_schedule IS 'Payment milestones: [{ amount, due_date, description, status }]';
COMMENT ON COLUMN public.onboarding_checklists.items IS 'Checklist items: [{ id, title, description, completed, completed_at, completed_by }]';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary of changes:
-- [check] Created generate_nanoid() function for public URL IDs
-- [check] Created proposal_templates table with studio-scoped templates
-- [check] Created proposals table with e-signature audit trail
-- [check] Created onboarding_checklists table for client onboarding
-- [check] Added RLS policies for all tables (studio member access)
-- [check] Added indexes for efficient querying
-- [check] Added updated_at triggers for all tables
--
-- ============================================================================

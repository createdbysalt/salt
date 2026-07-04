-- ============================================================================
-- Service AI Context: Extend workspace_services with AI-fillable fields
-- ============================================================================
-- Adds value proposition, differentiators, prerequisites, discovery questions,
-- and AI pitch to services. Each field has a companion *_source column to
-- track whether it was manually entered or AI-proposed.
-- ============================================================================

-- ─── Value proposition ──────────────────────────────────────────────────────
ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS value_proposition TEXT;

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS value_proposition_source TEXT
    DEFAULT 'manual'
    CHECK (value_proposition_source IN ('manual', 'ai_proposed', 'ai_confirmed'));

-- ─── Differentiators ────────────────────────────────────────────────────────
ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS differentiators TEXT[] DEFAULT '{}';

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS differentiators_source TEXT
    DEFAULT 'manual'
    CHECK (differentiators_source IN ('manual', 'ai_proposed', 'ai_confirmed'));

-- ─── Prerequisites ──────────────────────────────────────────────────────────
ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS prerequisites TEXT[] DEFAULT '{}';

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS prerequisites_source TEXT
    DEFAULT 'manual'
    CHECK (prerequisites_source IN ('manual', 'ai_proposed', 'ai_confirmed'));

-- ─── Discovery questions ────────────────────────────────────────────────────
ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS discovery_questions TEXT[] DEFAULT '{}';

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS discovery_questions_source TEXT
    DEFAULT 'manual'
    CHECK (discovery_questions_source IN ('manual', 'ai_proposed', 'ai_confirmed'));

-- ─── AI pitch ───────────────────────────────────────────────────────────────
ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS ai_pitch TEXT;

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS ai_pitch_source TEXT
    DEFAULT 'manual'
    CHECK (ai_pitch_source IN ('manual', 'ai_proposed', 'ai_confirmed'));

-- ─── Comments ───────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.workspace_services.value_proposition IS
  'The transformation/outcome clients get (e.g., "Transform from startup-looking to investor-ready in 4 weeks")';

COMMENT ON COLUMN public.workspace_services.value_proposition_source IS
  'manual = user wrote, ai_proposed = Salt drafted, ai_confirmed = Salt wrote and user approved';

COMMENT ON COLUMN public.workspace_services.differentiators IS
  'What makes this service unique vs competitors (e.g., ["Strategy-first approach", "Founder-friendly process"])';

COMMENT ON COLUMN public.workspace_services.prerequisites IS
  'What the client needs before this service (e.g., ["Clear target market", "Budget approved"])';

COMMENT ON COLUMN public.workspace_services.discovery_questions IS
  'Questions to qualify prospects for this service (e.g., ["What''s driving the rebrand now?"])';

COMMENT ON COLUMN public.workspace_services.ai_pitch IS
  'Salt''s optimized pitch text for proposals targeting this service';

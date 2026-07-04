-- ============================================================================
-- Service Sales Intelligence: AI-fillable context for proposals and upsells
-- ============================================================================
-- Adds three JSONB columns to workspace_services for sales context, pricing
-- intelligence, and AI generation guidance. Each has a companion *_source
-- column for AI provenance tracking.
-- Also adds is_bundle flag for package services.
-- ============================================================================

-- ─── Bundle Flag ────────────────────────────────────────────────────────────
ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.workspace_services.is_bundle IS
  'True if this service is a bundle/package containing other services (linked via service_relationships with type bundle_component)';

-- ─── Sales Context ──────────────────────────────────────────────────────────
-- Objections, competitive positioning, timing triggers
ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS ai_sales_context JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS ai_sales_context_source TEXT
    DEFAULT 'manual'
    CHECK (ai_sales_context_source IN ('manual', 'ai_proposed', 'ai_confirmed'));

COMMENT ON COLUMN public.workspace_services.ai_sales_context IS
  'Sales enablement context: objections[], competitive_positioning{}, ideal_timing{}. Used by Plays for proposals.';

-- ─── Pricing Intelligence ───────────────────────────────────────────────────
-- ROI metrics, discount rules, value anchors
ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS pricing_intelligence JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS pricing_intelligence_source TEXT
    DEFAULT 'manual'
    CHECK (pricing_intelligence_source IN ('manual', 'ai_proposed', 'ai_confirmed'));

COMMENT ON COLUMN public.workspace_services.pricing_intelligence IS
  'Pricing context: roi_metrics[], discount_rules[], floor_price_cents, anchors{}. Used by Plays for value justification.';

-- ─── AI Generation Context ──────────────────────────────────────────────────
-- Tone, keywords, proof matching, pitch variants
ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS ai_generation_context JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS ai_generation_context_source TEXT
    DEFAULT 'manual'
    CHECK (ai_generation_context_source IN ('manual', 'ai_proposed', 'ai_confirmed'));

COMMENT ON COLUMN public.workspace_services.ai_generation_context IS
  'AI writing guidance: tone, include_keywords[], avoid_keywords[], primary_outcomes[], pitch_variants{}. Shapes Play tone.';

-- ─── JSON Schema Comments ───────────────────────────────────────────────────
-- These document the expected structure for each JSONB column

COMMENT ON COLUMN public.workspace_services.ai_sales_context IS
$comment$Sales enablement context. Expected structure:
{
  "objections": [{"objection": "Too expensive", "response": "...", "source": "operator|learned"}],
  "competitive_positioning": {
    "vs_diy": "DIY takes 3x longer and lacks strategic foundation",
    "vs_agencies": "Agency overhead = 2x cost for same deliverable",
    "vs_freelancers": "Our process includes strategy, not just execution",
    "unique_advantage": "Founder-led with 10+ years brand experience"
  },
  "ideal_timing": {
    "triggers": ["New funding", "Rebrand announced", "New market entry"],
    "buying_signals": ["Asked about timeline", "Mentioned competitor", "Budget approved"],
    "seasonal_relevance": "Q1 budget planning"
  }
}$comment$;

COMMENT ON COLUMN public.workspace_services.pricing_intelligence IS
$comment$Pricing and value context. Expected structure:
{
  "roi_metrics": [
    {"metric": "Revenue increase", "typical_result": "2-3x", "proof_source": "Client case study"},
    {"metric": "Time to market", "typical_result": "4 weeks vs 3 months DIY", "proof_source": null}
  ],
  "payback_period": "2-3 months",
  "discount_rules": [
    {"condition": "bundled_with_strategy", "discount_percent": 15, "approval_required": false},
    {"condition": "annual_retainer", "discount_percent": 10, "approval_required": false},
    {"condition": "referral", "discount_percent": 10, "approval_required": true}
  ],
  "floor_price_cents": 500000,
  "anchors": {
    "agency_equivalent_cents": 2500000,
    "diy_cost_estimate_cents": 1500000,
    "opportunity_cost": "3-6 months of subpar brand perception"
  }
}$comment$;

COMMENT ON COLUMN public.workspace_services.ai_generation_context IS
$comment$AI writing and tone guidance. Expected structure:
{
  "tone": "consultative",
  "personality_notes": "Be direct, avoid jargon, lead with outcomes",
  "include_keywords": ["transformation", "strategic", "ROI", "differentiation"],
  "avoid_keywords": ["cheap", "discount", "basic", "simple"],
  "primary_outcomes": ["Market differentiation", "Revenue growth", "Time savings"],
  "proof_priority": ["metrics", "testimonials", "case_studies"],
  "pitch_variants": {
    "elevator": "I help solo founders look as legit as funded startups—brand strategy to launch in 4 weeks.",
    "email": "Most solopreneurs DIY their brand and blend in. I build brands that command premium pricing.",
    "proposal_intro": "You're ready to stop competing on price. Let's build a brand that justifies what you're worth."
  }
}$comment$;

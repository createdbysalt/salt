-- ============================================================================
-- RECORD AI SUMMARY: Cached AI narrative for People / Orgs / Work overview
-- ============================================================================
-- Caches the AI-generated "Summary" and "Worth attention" narrative produced
-- by app/_lib/ai/record-summary-ai.ts. The deterministic builder in
-- app/_features/memory/utils/record-summary.ts remains the guaranteed fallback;
-- these columns simply avoid regenerating on every page load.
--
-- Freshness model (mirrors relationship-health cache precedent):
--   ai_summary_inputs_hash = stable hash of the signals the narrative was built
--   from. Read path reuses the cache when the hash matches current signals AND
--   ai_summary_generated_at is within TTL; otherwise it is treated as stale.
--
-- Columns inherit each table's existing RLS — no new policies required.
-- ============================================================================

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_worth_attention text,
  ADD COLUMN IF NOT EXISTS ai_worth_attention_play text,
  ADD COLUMN IF NOT EXISTS ai_summary_inputs_hash text,
  ADD COLUMN IF NOT EXISTS ai_summary_model text,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at timestamptz;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_worth_attention text,
  ADD COLUMN IF NOT EXISTS ai_worth_attention_play text,
  ADD COLUMN IF NOT EXISTS ai_summary_inputs_hash text,
  ADD COLUMN IF NOT EXISTS ai_summary_model text,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at timestamptz;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_worth_attention text,
  ADD COLUMN IF NOT EXISTS ai_worth_attention_play text,
  ADD COLUMN IF NOT EXISTS ai_summary_inputs_hash text,
  ADD COLUMN IF NOT EXISTS ai_summary_model text,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at timestamptz;

COMMENT ON COLUMN public.people.ai_summary IS 'Cached AI-generated Summary line; null falls back to deterministic builder.';
COMMENT ON COLUMN public.people.ai_worth_attention IS 'Cached AI-generated Worth attention reason; null falls back to deterministic resolver.';
COMMENT ON COLUMN public.people.ai_worth_attention_play IS 'Cached AI-suggested next action for Worth attention (may be empty).';
COMMENT ON COLUMN public.people.ai_summary_inputs_hash IS 'Stable hash of signal inputs; cache is stale when it no longer matches current signals.';
COMMENT ON COLUMN public.people.ai_summary_model IS 'Model identifier that produced the cached narrative.';
COMMENT ON COLUMN public.people.ai_summary_generated_at IS 'When the cached narrative was generated (drives TTL freshness).';

COMMENT ON COLUMN public.organizations.ai_summary IS 'Cached AI-generated Summary line; null falls back to deterministic builder.';
COMMENT ON COLUMN public.organizations.ai_worth_attention IS 'Cached AI-generated Worth attention reason; null falls back to deterministic resolver.';
COMMENT ON COLUMN public.organizations.ai_worth_attention_play IS 'Cached AI-suggested next action for Worth attention (may be empty).';
COMMENT ON COLUMN public.organizations.ai_summary_inputs_hash IS 'Stable hash of signal inputs; cache is stale when it no longer matches current signals.';
COMMENT ON COLUMN public.organizations.ai_summary_model IS 'Model identifier that produced the cached narrative.';
COMMENT ON COLUMN public.organizations.ai_summary_generated_at IS 'When the cached narrative was generated (drives TTL freshness).';

COMMENT ON COLUMN public.projects.ai_summary IS 'Cached AI-generated Summary line; null falls back to deterministic builder.';
COMMENT ON COLUMN public.projects.ai_worth_attention IS 'Cached AI-generated Worth attention reason; null falls back to deterministic resolver.';
COMMENT ON COLUMN public.projects.ai_worth_attention_play IS 'Cached AI-suggested next action for Worth attention (may be empty).';
COMMENT ON COLUMN public.projects.ai_summary_inputs_hash IS 'Stable hash of signal inputs; cache is stale when it no longer matches current signals.';
COMMENT ON COLUMN public.projects.ai_summary_model IS 'Model identifier that produced the cached narrative.';
COMMENT ON COLUMN public.projects.ai_summary_generated_at IS 'When the cached narrative was generated (drives TTL freshness).';

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- ALTER TABLE public.people        DROP COLUMN IF EXISTS ai_summary, DROP COLUMN IF EXISTS ai_worth_attention, DROP COLUMN IF EXISTS ai_worth_attention_play, DROP COLUMN IF EXISTS ai_summary_inputs_hash, DROP COLUMN IF EXISTS ai_summary_model, DROP COLUMN IF EXISTS ai_summary_generated_at;
-- ALTER TABLE public.organizations DROP COLUMN IF EXISTS ai_summary, DROP COLUMN IF EXISTS ai_worth_attention, DROP COLUMN IF EXISTS ai_worth_attention_play, DROP COLUMN IF EXISTS ai_summary_inputs_hash, DROP COLUMN IF EXISTS ai_summary_model, DROP COLUMN IF EXISTS ai_summary_generated_at;
-- ALTER TABLE public.projects      DROP COLUMN IF EXISTS ai_summary, DROP COLUMN IF EXISTS ai_worth_attention, DROP COLUMN IF EXISTS ai_worth_attention_play, DROP COLUMN IF EXISTS ai_summary_inputs_hash, DROP COLUMN IF EXISTS ai_summary_model, DROP COLUMN IF EXISTS ai_summary_generated_at;

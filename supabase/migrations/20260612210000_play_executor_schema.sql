-- Play executor schema (Plays Wave 2, Phase 3 contract)
-- Plan: .cursor/plans/2026-06-12-plays-wave-2-acting-engine.md
--
-- 1. Executor states: approved/scheduled → executing → ran|failed; failed → queued (retry).
-- 2. Step journal + cost metering live in play_runs.metadata (idempotent resume).
-- 3. Value metering: estimated at completion, upgraded to actual by a Wave 3
--    attribution job. UI must always show the basis — never overclaim.
-- 4. Compiled definition (execution layer) + procedure_md (MD authoring layer)
--    on play_templates.
-- 5. Partial index for the future cross-studio scheduled-run picker.

-- ── play_runs: states ──
ALTER TABLE public.play_runs
  DROP CONSTRAINT IF EXISTS play_runs_state_check;

ALTER TABLE public.play_runs
  ADD CONSTRAINT play_runs_state_check CHECK (
    state IN ('draft', 'queued', 'approved', 'scheduled', 'executing', 'ran', 'failed', 'dismissed')
  );

-- ── play_runs: executor + value metering columns ──
ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS value_kind text
    CHECK (value_kind IS NULL OR value_kind IN ('invoice_collected', 'invoice_sent', 'booking_created', 'time_saved', 'gap_closed')),
  ADD COLUMN IF NOT EXISTS value_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS value_currency text,
  ADD COLUMN IF NOT EXISTS value_basis text
    CHECK (value_basis IS NULL OR value_basis IN ('estimated', 'actual')),
  ADD COLUMN IF NOT EXISTS value_attributed_at timestamptz;

COMMENT ON COLUMN public.play_runs.metadata IS
  'Executor step journal (idempotent resume), cost metering, skip reasons.';
COMMENT ON COLUMN public.play_runs.value_basis IS
  'estimated until a connector read proves the outcome; UI must show the basis.';

-- ── play_templates: compiled definition + MD procedure ──
ALTER TABLE public.play_templates
  ADD COLUMN IF NOT EXISTS definition jsonb,
  ADD COLUMN IF NOT EXISTS procedure_md text;

COMMENT ON COLUMN public.play_templates.definition IS
  'Compiled step list (validated by app/_features/plays/utils/play-definition.ts). Act slugs fixed at compile time.';
COMMENT ON COLUMN public.play_templates.procedure_md IS
  'Human-readable procedure — the MD authoring layer the GROW loop patches.';

-- ── Scheduled-run picker: existing indexes are studio-scoped; the scheduler
--    scans cross-studio for due runs. Partial index keeps it cheap. ──
CREATE INDEX IF NOT EXISTS idx_play_runs_scheduled_due
  ON public.play_runs (scheduled_for)
  WHERE state = 'scheduled';

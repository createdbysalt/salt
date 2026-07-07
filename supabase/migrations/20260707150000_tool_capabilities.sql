-- ============================================================================
-- TOOL CAPABILITIES (capability/intent layer — plan 2026-07-07 WS3.1)
-- ============================================================================
--
-- Maps a Salt capability ("send_message", "read_calendar") to the concrete
-- Composio tool slugs that satisfy it, per provider, with a priority. Lets a
-- playbook declare intent instead of a hardcoded tool slug; the resolver picks
-- the best connected + allowed + scope-permitted tool at runtime.
--
-- Platform-global reference data: authenticated read, service-role write
-- (same posture as connector_catalog / tool_classifications).
-- ============================================================================

CREATE TABLE public.tool_capabilities (
  -- Salt capability vocabulary key (e.g. 'send_message', 'read_calendar')
  capability_key text NOT NULL,
  -- Concrete Composio tool that satisfies it
  tool_slug text NOT NULL,
  -- Provider that owns the tool (denormalized for cheap workspace filtering)
  provider_key text NOT NULL,
  -- Lower = preferred when multiple providers satisfy the same capability
  priority integer NOT NULL DEFAULT 100,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (capability_key, tool_slug)
);

CREATE INDEX idx_tool_capabilities_key_priority
  ON public.tool_capabilities (capability_key, priority);
CREATE INDEX idx_tool_capabilities_provider
  ON public.tool_capabilities (provider_key);

CREATE TRIGGER tool_capabilities_set_updated_at
  BEFORE UPDATE ON public.tool_capabilities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tool_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read tool capabilities"
  ON public.tool_capabilities FOR SELECT TO authenticated USING (true);

-- Post-push schema assertion (the ledger has lied before).
DO $$
BEGIN
  IF to_regclass('public.tool_capabilities') IS NULL THEN
    RAISE EXCEPTION 'tool_capabilities table missing after migration';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tool_capabilities_set_updated_at'
  ) THEN
    RAISE EXCEPTION 'tool_capabilities updated_at trigger missing';
  END IF;
END $$;

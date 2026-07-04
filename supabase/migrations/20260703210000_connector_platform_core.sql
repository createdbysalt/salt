-- ============================================================================
-- CONNECTOR PLATFORM CORE (connector-platform plan Phase 2.1)
-- ============================================================================
--
-- Composio's catalog is the source of truth; Salt persists only deltas:
--   connector_catalog       synced toolkit metadata (sync job owns rows)
--   connector_tools         synced per-tool metadata + JSON schemas
--   connector_trigger_types synced trigger types per toolkit
--   connector_overrides     Salt's judgment: tier, pinned auth config
--   tool_classifications    Salt's safety judgment per tool (fail closed)
--   connector_sync_events   drift log (removed/changed slugs → alert rows)
--
-- These are PLATFORM-GLOBAL tables (no workspace_id): the catalog and risk
-- classifications are the same for every workspace. Workspace-scoped state
-- stays where it lives today (workspace_integrations, workspace_connector
-- policy tables).
--
-- Fail-closed invariant: a tool with no APPROVED classification row can
-- never execute. The execution gate enforces this in code; these tables are
-- the data it reads.
-- ============================================================================

-- ── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE public.connector_tool_risk AS ENUM ('read', 'mutating', 'destructive');

CREATE TYPE public.tool_classification_status AS ENUM (
  'unclassified',  -- synced, never reviewed: unusable
  'proposed',      -- LLM proposal awaiting human review: unusable
  'approved',      -- human-approved: usable per risk class
  'rejected',      -- human said no: unusable
  'disabled'       -- auto-disabled by drift detection: unusable until re-review
);

CREATE TYPE public.connector_tier AS ENUM (
  'catalog_only',  -- visible in catalog, not connectable/usable
  'action',        -- connectable; classified tools usable via the gate
  'capture'        -- action + feeds memory via a capture adapter
);

CREATE TYPE public.catalog_sync_status AS ENUM ('active', 'changed', 'removed');

-- ── connector_catalog (synced) ──────────────────────────────────────────────

CREATE TABLE public.connector_catalog (
  provider_key text PRIMARY KEY,
  toolkit_slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'productivity',
  auth_method text NOT NULL DEFAULT 'oauth'
    CHECK (auth_method IN ('oauth', 'api_key', 'no_auth')),
  logo_url text,
  coming_soon boolean NOT NULL DEFAULT false,
  -- Raw synced toolkit metadata (auth schemes, composio categories, …)
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  sync_status public.catalog_sync_status NOT NULL DEFAULT 'active',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── connector_overrides (Salt-owned; sync never writes) ────────────────────

CREATE TABLE public.connector_overrides (
  provider_key text PRIMARY KEY
    REFERENCES public.connector_catalog(provider_key) ON DELETE CASCADE,
  tier public.connector_tier NOT NULL DEFAULT 'catalog_only',
  -- Pinned Composio auth config (empty = not connectable → comingSoon)
  auth_config_id text NOT NULL DEFAULT '',
  -- Env var consulted before the pinned default (per-environment override)
  auth_config_env_var text,
  -- API-key connectors: wire field name Composio expects for the user key
  api_key_field_name text,
  -- Extra connect-form fields (e.g. Shopify subdomain), UI-facing
  api_key_form jsonb,
  -- Ask Salt exposure (head connectors): slug prefix + capability label
  ask_salt_slug_prefix text,
  ask_salt_label text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── connector_tools (synced) ────────────────────────────────────────────────

CREATE TABLE public.connector_tools (
  tool_slug text PRIMARY KEY,
  toolkit_slug text NOT NULL,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  input_schema jsonb,
  output_schema jsonb,
  version text,
  -- Hash of input+output schema for cheap drift comparison
  schema_hash text,
  sync_status public.catalog_sync_status NOT NULL DEFAULT 'active',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_connector_tools_toolkit
  ON public.connector_tools (toolkit_slug);

-- ── connector_trigger_types (synced) ────────────────────────────────────────

CREATE TABLE public.connector_trigger_types (
  trigger_slug text PRIMARY KEY,
  toolkit_slug text NOT NULL,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  -- 'webhook' (provider pushes to Composio) or 'polling' (Composio polls)
  delivery text,
  payload_schema jsonb,
  config_schema jsonb,
  sync_status public.catalog_sync_status NOT NULL DEFAULT 'active',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_connector_trigger_types_toolkit
  ON public.connector_trigger_types (toolkit_slug);

-- ── tool_classifications (Salt's safety judgment; fail closed) ──────────────

CREATE TABLE public.tool_classifications (
  tool_slug text PRIMARY KEY,
  risk public.connector_tool_risk,
  requires_human_confirmation boolean NOT NULL DEFAULT true,
  status public.tool_classification_status NOT NULL DEFAULT 'unclassified',
  -- LLM proposal payload: { risk, requiresHumanConfirmation, reasoning, model }
  model_proposal jsonb,
  -- Provenance: 'seed' (generated from the hand-curated registry),
  -- 'llm' (model proposed), 'manual' (human authored directly)
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('seed', 'llm', 'manual')),
  classified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  proposed_at timestamptz,
  approved_at timestamptz,
  -- Set by drift detection when the sync job disables a classification
  disabled_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- An approved classification must carry a risk verdict
  CONSTRAINT tool_classifications_approved_has_risk
    CHECK (status <> 'approved' OR risk IS NOT NULL)
);

CREATE INDEX idx_tool_classifications_status
  ON public.tool_classifications (status);

-- ── connector_sync_events (drift log) ───────────────────────────────────────

CREATE TABLE public.connector_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN (
    'toolkit_added', 'toolkit_removed',
    'tool_added', 'tool_removed', 'tool_schema_changed',
    'trigger_added', 'trigger_removed',
    'classification_disabled', 'sync_failed'
  )),
  subject_slug text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz
);

CREATE INDEX idx_connector_sync_events_unacked
  ON public.connector_sync_events (created_at DESC)
  WHERE acknowledged_at IS NULL;

-- ── updated_at triggers ─────────────────────────────────────────────────────

CREATE TRIGGER connector_catalog_set_updated_at
  BEFORE UPDATE ON public.connector_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER connector_overrides_set_updated_at
  BEFORE UPDATE ON public.connector_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER connector_tools_set_updated_at
  BEFORE UPDATE ON public.connector_tools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER connector_trigger_types_set_updated_at
  BEFORE UPDATE ON public.connector_trigger_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tool_classifications_set_updated_at
  BEFORE UPDATE ON public.tool_classifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Platform-global reference data: authenticated users may read (the catalog
-- UI renders it); ALL writes go through the service-role admin client (sync
-- job, review-queue server actions). No authenticated write policies exist.

ALTER TABLE public.connector_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_trigger_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read connector catalog"
  ON public.connector_catalog FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read connector overrides"
  ON public.connector_overrides FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read connector tools"
  ON public.connector_tools FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read connector trigger types"
  ON public.connector_trigger_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read tool classifications"
  ON public.tool_classifications FOR SELECT TO authenticated USING (true);

-- Sync events are operator/admin-facing; not exposed to authenticated reads.

-- Entity Evidence Accumulation (Confidence-Gated Keeper Execution Phase 1)
--
-- Stores observations that haven't yet triggered mutations. Evidence accumulates
-- across captures until confidence crosses the user's threshold, then executes.
--
-- Design decisions:
-- 1. Field-specific TTL (email = never, role = 30d, record_status = 90d)
-- 2. Log-sigmoid corroboration with source diversity bonus
-- 3. Contradictions reset confidence, wait for tie-breaker

-- Evidence types (extends capture evidence taxonomy)
CREATE TYPE keeper_evidence_type AS ENUM (
  'email_match',
  'name_match',
  'context_match',
  'recency',
  'frequency',
  'llm_inference',
  'explicit_mention',    -- Direct statement in capture ("Jane is my client")
  'behavioral_signal',   -- Inferred from actions (sent invoice, scheduled meeting)
  'cross_reference'      -- Corroborated by another entity's data
);

-- Resolution outcomes
CREATE TYPE evidence_resolution AS ENUM (
  'applied',      -- Confidence crossed threshold, mutation executed
  'superseded',   -- Newer evidence replaced this
  'dismissed',    -- User dismissed via correction
  'expired',      -- TTL exceeded
  'contradicted'  -- Conflicting evidence voided this
);

CREATE TABLE entity_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Target entity
  entity_type TEXT NOT NULL,  -- 'person', 'organization', 'work', 'meeting', 'file', 'me'
  entity_id UUID NOT NULL,

  -- What we're trying to learn
  field_path TEXT NOT NULL,   -- 'record_status', 'industry', 'role', 'company_name'
  proposed_value JSONB NOT NULL,

  -- Confidence scoring
  confidence SMALLINT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  evidence_type keeper_evidence_type NOT NULL,
  evidence_details JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Source tracking
  source_type TEXT NOT NULL,           -- 'gmail', 'meeting', 'manual', etc.
  source_capture_id UUID,  -- Reference to capture_events.id (no FK to avoid coupling)
  source_external_id TEXT,             -- External reference (email ID, etc.)

  -- Playbook tracking
  playbook_slug TEXT,

  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_days INTEGER,                    -- Field-specific TTL (null = never expires)
  expires_at TIMESTAMPTZ,              -- Computed on insert: created_at + ttl_days

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution evidence_resolution,
  resolution_details JSONB,            -- { applied_to_run_id, superseded_by, etc. }

  -- Constraints
  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'person', 'organization', 'work', 'meeting', 'file', 'me', 'billing'
  ))
);

-- Primary lookup: unresolved evidence for an entity field
CREATE INDEX idx_entity_evidence_lookup
  ON entity_evidence(workspace_id, entity_type, entity_id, field_path)
  WHERE resolved_at IS NULL;

-- Expiration cleanup
CREATE INDEX idx_entity_evidence_expiring
  ON entity_evidence(expires_at)
  WHERE resolved_at IS NULL AND expires_at IS NOT NULL;

-- Playbook analysis
CREATE INDEX idx_entity_evidence_playbook
  ON entity_evidence(workspace_id, playbook_slug)
  WHERE resolved_at IS NULL;

-- Source deduplication
CREATE INDEX idx_entity_evidence_source
  ON entity_evidence(workspace_id, source_capture_id)
  WHERE source_capture_id IS NOT NULL;

-- RLS
ALTER TABLE entity_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace evidence"
  ON entity_evidence FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert evidence in their workspace"
  ON entity_evidence FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update evidence in their workspace"
  ON entity_evidence FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

-- Service role bypass
CREATE POLICY "Service role full access"
  ON entity_evidence FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE entity_evidence IS
'Accumulated observations for keeper playbooks. Evidence builds across captures until confidence crosses threshold.';

COMMENT ON COLUMN entity_evidence.ttl_days IS
'Field-specific TTL. email=null (never), role=30, record_status=90. Set by playbook.';

COMMENT ON COLUMN entity_evidence.confidence IS
'0-100 scale. Aggregated across all unresolved evidence for same entity+field.';

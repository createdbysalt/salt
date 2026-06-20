-- ============================================================================
-- Migration: Connector trust ladder
-- ============================================================================
--
-- Adds trust_level to workspace_integrations. New connections start read-only
-- (Salt can look but never act); the user explicitly upgrades a connector to
-- act-with-approval. Email mode (draft | send) lives in config jsonb — absence
-- means draft mode, the safe default.
-- ============================================================================

ALTER TABLE public.workspace_integrations
  ADD COLUMN IF NOT EXISTS trust_level text NOT NULL DEFAULT 'read_only'
  CHECK (trust_level IN ('read_only', 'act_with_approval'));

COMMENT ON COLUMN public.workspace_integrations.trust_level IS
  'Connector trust ladder: read_only (no mutating tools registered) or act_with_approval (mutating tools behind human approval). Email mode (draft|send) is stored in config.emailMode; absent = draft.';

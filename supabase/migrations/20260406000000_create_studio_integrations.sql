-- ============================================================================
-- Migration: Create studio_integrations table
-- ============================================================================
-- Stores encrypted API keys and configuration for third-party integrations
-- per studio. Supports Cal.com (scheduling) and Fireflies.ai (transcription).
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLE
-- ============================================================================

CREATE TABLE public.studio_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

  -- Integration provider: 'calcom' | 'fireflies'
  provider text NOT NULL CHECK (provider IN ('calcom', 'fireflies')),

  -- Encrypted API key (encrypted at application level)
  api_key_encrypted text,

  -- Provider-specific configuration (JSONB)
  -- Cal.com: { username, webhookSecret, eventTypesSynced: { localId: calId } }
  -- Fireflies: { webhookSecret, botEmail }
  config jsonb DEFAULT '{}'::jsonb,

  -- Connection status
  is_active boolean DEFAULT true,
  connected_at timestamptz DEFAULT now(),
  connected_by uuid REFERENCES auth.users(id),
  last_synced_at timestamptz,
  last_error text,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- One integration per provider per studio
  UNIQUE(studio_id, provider)
);

-- ============================================================================
-- STEP 2: CREATE INDEXES
-- ============================================================================

CREATE INDEX studio_integrations_studio_id_idx ON studio_integrations(studio_id);
CREATE INDEX studio_integrations_provider_idx ON studio_integrations(provider);
CREATE INDEX studio_integrations_active_idx ON studio_integrations(studio_id, provider) WHERE is_active = true;

-- ============================================================================
-- STEP 3: ENABLE RLS
-- ============================================================================

ALTER TABLE studio_integrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================================================

-- Studio admins and owners can view integrations
CREATE POLICY "studio_admins_view_integrations" ON studio_integrations
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Studio admins and owners can manage integrations
CREATE POLICY "studio_admins_manage_integrations" ON studio_integrations
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- STEP 5: CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_studio_integrations_updated_at
  BEFORE UPDATE ON studio_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE studio_integrations IS 'Stores encrypted API keys and configuration for third-party integrations (Cal.com, Fireflies.ai) per studio';
COMMENT ON COLUMN studio_integrations.provider IS 'Integration provider: calcom (scheduling), fireflies (transcription)';
COMMENT ON COLUMN studio_integrations.api_key_encrypted IS 'API key encrypted at application level using AES-256-GCM';
COMMENT ON COLUMN studio_integrations.config IS 'Provider-specific configuration (username, webhook secrets, sync state)';

-- ============================================================================
-- Migration Checklist
-- ============================================================================
-- [x] Created studio_integrations table with proper constraints
-- [x] Added indexes for common query patterns
-- [x] Enabled RLS with admin-only access
-- [x] Added updated_at trigger
-- [x] Added documentation comments

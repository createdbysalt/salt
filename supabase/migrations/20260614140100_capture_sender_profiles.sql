-- ============================================================================
-- CAPTURE SENDER PROFILES: Per-workspace learned sender classification
-- Scales vendor vs client detection across users without a global SaaS list.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capture_sender_kind') THEN
    CREATE TYPE public.capture_sender_kind AS ENUM (
      'client',
      'vendor_saas',
      'payment_rail'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.capture_sender_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Normalized lowercase: full email or registrable domain (e.g. linear.app)
  sender_key TEXT NOT NULL,
  sender_key_type TEXT NOT NULL CHECK (sender_key_type IN ('email', 'domain')),

  kind public.capture_sender_kind NOT NULL,
  vendor_name TEXT,

  source TEXT NOT NULL CHECK (
    source IN (
      'user_dismiss',
      'user_confirm',
      'auto_receipt',
      'auto_scan',
      'manual'
    )
  ),
  confidence INTEGER NOT NULL DEFAULT 80 CHECK (confidence >= 0 AND confidence <= 100),
  evidence_count INTEGER NOT NULL DEFAULT 1,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, sender_key_type, sender_key)
);

CREATE INDEX IF NOT EXISTS capture_sender_profiles_workspace_idx
  ON public.capture_sender_profiles(workspace_id);

CREATE INDEX IF NOT EXISTS capture_sender_profiles_domain_lookup_idx
  ON public.capture_sender_profiles(workspace_id, sender_key)
  WHERE sender_key_type = 'domain';

CREATE INDEX IF NOT EXISTS capture_sender_profiles_email_lookup_idx
  ON public.capture_sender_profiles(workspace_id, sender_key)
  WHERE sender_key_type = 'email';

CREATE TRIGGER set_capture_sender_profiles_updated_at
  BEFORE UPDATE ON public.capture_sender_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.capture_sender_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_members_view_sender_profiles" ON public.capture_sender_profiles;
CREATE POLICY "workspace_members_view_sender_profiles" ON public.capture_sender_profiles
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "workspace_members_manage_sender_profiles" ON public.capture_sender_profiles;
CREATE POLICY "workspace_members_manage_sender_profiles" ON public.capture_sender_profiles
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

COMMENT ON TABLE public.capture_sender_profiles IS
  'Per-workspace sender classification learned from dismiss/apply actions and receipt heuristics.';

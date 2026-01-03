-- =============================================
-- Bridge Invoice Access Tokens
-- =============================================
-- Tokenized invoice links for secure client access
-- Supports 30-day TTL, rotation/revocation, and spent_for_checkout tracking

CREATE TABLE public.bridge_invoice_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.bridge_invoices(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  spent_for_checkout boolean DEFAULT false,
  used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  last_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Index for fast lookups by token hash
CREATE INDEX idx_bridge_invoice_access_tokens_token_hash ON public.bridge_invoice_access_tokens(token_hash) WHERE revoked_at IS NULL;

-- Index for finding tokens by invoice
CREATE INDEX idx_bridge_invoice_access_tokens_invoice ON public.bridge_invoice_access_tokens(invoice_id);

-- Index for cleanup of expired tokens
CREATE INDEX idx_bridge_invoice_access_tokens_expires_at ON public.bridge_invoice_access_tokens(expires_at);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE public.bridge_invoice_access_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can manage all tokens
CREATE POLICY "Service role full access to invoice access tokens"
  ON public.bridge_invoice_access_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Studio owners can view tokens for their invoices
CREATE POLICY "Studio owners can view their invoice tokens"
  ON public.bridge_invoice_access_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bridge_invoices bi
      WHERE bi.id = bridge_invoice_access_tokens.invoice_id
        AND bi.studio_id IN (
          SELECT studio_id
          FROM public.studio_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- =============================================
-- Helper Functions
-- =============================================

-- Function to revoke all active tokens for an invoice
CREATE OR REPLACE FUNCTION public.revoke_invoice_tokens(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bridge_invoice_access_tokens
  SET revoked_at = timezone('utc'::text, now())
  WHERE invoice_id = p_invoice_id
    AND revoked_at IS NULL
    AND expires_at > timezone('utc'::text, now());
END;
$$;

-- Function to mark token as spent for checkout
CREATE OR REPLACE FUNCTION public.mark_token_spent_for_checkout(p_token_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE public.bridge_invoice_access_tokens
  SET 
    spent_for_checkout = true,
    used_at = timezone('utc'::text, now())
  WHERE token_hash = p_token_hash
    AND revoked_at IS NULL
    AND expires_at > timezone('utc'::text, now())
  RETURNING true INTO v_updated;
  
  RETURN COALESCE(v_updated, false);
END;
$$;

-- Function to clean up expired tokens (run via cron/periodic job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_invoice_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete tokens expired more than 90 days ago (keep for audit trail)
  DELETE FROM public.bridge_invoice_access_tokens
  WHERE expires_at < timezone('utc'::text, now()) - interval '90 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

COMMENT ON TABLE public.bridge_invoice_access_tokens IS 'Tokenized access links for client invoice viewing and payment. Supports 30-day TTL, rotation/revocation, and spent_for_checkout tracking.';
COMMENT ON COLUMN public.bridge_invoice_access_tokens.token_hash IS 'SHA-256 hash of the access token (raw token never stored)';
COMMENT ON COLUMN public.bridge_invoice_access_tokens.spent_for_checkout IS 'True if token was used to create a Checkout session; prevents double-charging but still allows read-only paid view';
COMMENT ON COLUMN public.bridge_invoice_access_tokens.revoked_at IS 'Timestamp when token was revoked (e.g., when a new link is issued)';
COMMENT ON COLUMN public.bridge_invoice_access_tokens.last_sent_at IS 'Timestamp when token link was last emailed to client';


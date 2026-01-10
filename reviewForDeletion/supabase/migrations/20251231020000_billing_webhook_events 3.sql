-- ============================================================================
-- BILLING: Webhook event tracking and idempotency
-- ============================================================================
-- This table ensures webhook events are processed exactly once
-- and provides audit trail for debugging payment issues
-- ============================================================================

CREATE TABLE public.billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  endpoint text NOT NULL,
  event_type text NOT NULL,
  stripe_created timestamp with time zone NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamp with time zone,
  processing_error text,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT valid_endpoint CHECK (endpoint IN ('saas', 'connect'))
);

-- Enable RLS (service role only for webhooks)
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/update webhook events
CREATE POLICY "Service role can manage webhook events"
  ON public.billing_webhook_events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Studio owners can view their own webhook events (for debugging)
CREATE POLICY "Studio owners can view their webhook events"
  ON public.billing_webhook_events
  FOR SELECT
  USING (
    -- Check if the event relates to this user's Stripe customer
    payload->>'customer' IN (
      SELECT customer_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    -- Check if the event relates to this user's Connect account
    (payload->'account')::text LIKE '%' || (
      SELECT stripe_connect_account_id FROM public.profiles WHERE id = auth.uid()
    ) || '%'
  );

-- Indexes for performance
CREATE INDEX idx_webhook_events_stripe_event_id ON public.billing_webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_endpoint ON public.billing_webhook_events(endpoint);
CREATE INDEX idx_webhook_events_type ON public.billing_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed_at ON public.billing_webhook_events(processed_at);
CREATE INDEX idx_webhook_events_created_at ON public.billing_webhook_events(created_at DESC);

-- Partial index for unprocessed events
CREATE INDEX idx_webhook_events_unprocessed ON public.billing_webhook_events(created_at)
  WHERE processed_at IS NULL;

COMMENT ON TABLE public.billing_webhook_events IS 'Stripe webhook event log for idempotency and audit trail';
COMMENT ON COLUMN public.billing_webhook_events.stripe_event_id IS 'Unique Stripe event ID (e.g., evt_xxx) - ensures idempotency';
COMMENT ON COLUMN public.billing_webhook_events.endpoint IS 'Which webhook endpoint received this: saas or connect';
COMMENT ON COLUMN public.billing_webhook_events.event_type IS 'Stripe event type (e.g., checkout.session.completed)';
COMMENT ON COLUMN public.billing_webhook_events.processed_at IS 'When the event was successfully processed';
COMMENT ON COLUMN public.billing_webhook_events.processing_error IS 'Error message if processing failed';




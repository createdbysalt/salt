-- ============================================================================
-- BILLING: Bridge client subscriptions (retainers)
-- ============================================================================
-- Manages recurring subscriptions for client retainers
-- Created on studio owner's Stripe Connect account
-- ============================================================================

CREATE TABLE public.bridge_client_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  stripe_subscription_id text NOT NULL,
  stripe_customer_id text NOT NULL,
  status text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  interval text NOT NULL,
  interval_count integer NOT NULL DEFAULT 1,
  description text,
  services_included jsonb DEFAULT '[]'::jsonb,
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT positive_amount CHECK (amount_cents > 0),
  CONSTRAINT valid_status CHECK (
    status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')
  ),
  CONSTRAINT valid_interval CHECK (interval IN ('day', 'week', 'month', 'year')),
  CONSTRAINT valid_currency CHECK (currency IN ('usd', 'cad', 'gbp', 'eur', 'aud'))
);

-- Enable RLS
ALTER TABLE public.bridge_client_subscriptions ENABLE ROW LEVEL SECURITY;

-- Studio owners can manage their client subscriptions
CREATE POLICY "Studio owners can manage client subscriptions"
  ON public.bridge_client_subscriptions
  FOR ALL
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Clients can view their own subscriptions
CREATE POLICY "Clients can view their subscriptions"
  ON public.bridge_client_subscriptions
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
  );

-- Service role can manage subscriptions (webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON public.bridge_client_subscriptions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for performance
CREATE INDEX idx_bridge_client_subs_studio_id ON public.bridge_client_subscriptions(studio_id);
CREATE INDEX idx_bridge_client_subs_client_id ON public.bridge_client_subscriptions(client_id);
CREATE INDEX idx_bridge_client_subs_project_id ON public.bridge_client_subscriptions(project_id);
CREATE INDEX idx_bridge_client_subs_stripe_sub_id ON public.bridge_client_subscriptions(stripe_subscription_id);
CREATE INDEX idx_bridge_client_subs_status ON public.bridge_client_subscriptions(status);
CREATE INDEX idx_bridge_client_subs_period_end ON public.bridge_client_subscriptions(current_period_end);

-- Partial index for active subscriptions
CREATE INDEX idx_bridge_client_subs_active ON public.bridge_client_subscriptions(studio_id, client_id)
  WHERE status IN ('active', 'trialing');

-- Bridge Subscription Invoices (connects retainer invoices)
CREATE TABLE public.bridge_subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.bridge_client_subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  status text NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  paid_at timestamp with time zone,
  due_date timestamp with time zone,
  hosted_invoice_url text,
  invoice_pdf_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT valid_invoice_status CHECK (
    status IN ('draft', 'open', 'paid', 'uncollectible', 'void')
  )
);

-- Enable RLS
ALTER TABLE public.bridge_subscription_invoices ENABLE ROW LEVEL SECURITY;

-- Studio owners can view invoices for their subscriptions
CREATE POLICY "Studio owners can view subscription invoices"
  ON public.bridge_subscription_invoices
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM public.bridge_client_subscriptions
      WHERE studio_id IN (
        SELECT studio_id FROM public.studio_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Clients can view their subscription invoices
CREATE POLICY "Clients can view their subscription invoices"
  ON public.bridge_subscription_invoices
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM public.bridge_client_subscriptions
      WHERE client_id IN (
        SELECT client_id FROM public.client_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Service role can manage subscription invoices (webhooks)
CREATE POLICY "Service role can manage subscription invoices"
  ON public.bridge_subscription_invoices
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes
CREATE INDEX idx_bridge_sub_invoices_subscription_id ON public.bridge_subscription_invoices(subscription_id);
CREATE INDEX idx_bridge_sub_invoices_stripe_invoice_id ON public.bridge_subscription_invoices(stripe_invoice_id);
CREATE INDEX idx_bridge_sub_invoices_status ON public.bridge_subscription_invoices(status);
CREATE INDEX idx_bridge_sub_invoices_period_end ON public.bridge_subscription_invoices(period_end);

-- View to get subscription MRR by studio
CREATE OR REPLACE VIEW public.studio_mrr AS
SELECT
  studio_id,
  SUM(
    CASE
      WHEN interval = 'month' THEN amount_cents / 100.0
      WHEN interval = 'year' THEN (amount_cents / 100.0) / 12
      ELSE 0
    END
  ) as mrr_usd,
  COUNT(*) as active_subscriptions
FROM public.bridge_client_subscriptions
WHERE status IN ('active', 'trialing')
GROUP BY studio_id;

-- Comments
COMMENT ON TABLE public.bridge_client_subscriptions IS 'Recurring subscriptions (retainers) on studio owner Connect accounts';
COMMENT ON TABLE public.bridge_subscription_invoices IS 'Individual invoices generated by Stripe for subscription billing cycles';
COMMENT ON COLUMN public.bridge_client_subscriptions.services_included IS 'JSON array of services included in the retainer (e.g., ["Website maintenance", "Monthly content refresh"])';
COMMENT ON COLUMN public.bridge_client_subscriptions.interval IS 'Billing frequency: day, week, month, or year';
COMMENT ON COLUMN public.bridge_client_subscriptions.interval_count IS 'Number of intervals between billings (e.g., 1 = monthly, 3 = quarterly)';
COMMENT ON VIEW public.studio_mrr IS 'Monthly Recurring Revenue (MRR) by studio from active client subscriptions';




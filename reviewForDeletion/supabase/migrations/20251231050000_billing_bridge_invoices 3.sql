-- ============================================================================
-- BILLING: Bridge invoices and client payments
-- ============================================================================
-- Manages invoices studio owners send to their clients through The Bridge
-- Payments flow through studio owner's Stripe Connect account (0% platform fee)
-- ============================================================================

-- Bridge Invoices (studio owner → client)
CREATE TABLE public.bridge_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_number text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  description text,
  status text NOT NULL DEFAULT 'draft',
  due_date date,
  sent_at timestamp with time zone,
  paid_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT positive_amount CHECK (amount_cents > 0),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'canceled', 'failed')),
  CONSTRAINT valid_currency CHECK (currency IN ('usd', 'cad', 'gbp', 'eur', 'aud'))
);

-- Enable RLS
ALTER TABLE public.bridge_invoices ENABLE ROW LEVEL SECURITY;

-- Studio owners can manage their own invoices
CREATE POLICY "Studio owners can manage own invoices"
  ON public.bridge_invoices
  FOR ALL
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Clients can view invoices sent to them
CREATE POLICY "Clients can view their invoices"
  ON public.bridge_invoices
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
    AND status != 'draft'
  );

-- Indexes
CREATE INDEX idx_bridge_invoices_studio_id ON public.bridge_invoices(studio_id);
CREATE INDEX idx_bridge_invoices_client_id ON public.bridge_invoices(client_id);
CREATE INDEX idx_bridge_invoices_project_id ON public.bridge_invoices(project_id);
CREATE INDEX idx_bridge_invoices_status ON public.bridge_invoices(status);
CREATE INDEX idx_bridge_invoices_due_date ON public.bridge_invoices(due_date);
CREATE INDEX idx_bridge_invoices_created_at ON public.bridge_invoices(created_at DESC);

-- Partial indexes for common queries
CREATE INDEX idx_bridge_invoices_unpaid ON public.bridge_invoices(studio_id, due_date)
  WHERE status IN ('sent', 'viewed', 'overdue');

-- Bridge Invoice Payments (maps invoice to Stripe payment objects)
CREATE TABLE public.bridge_invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.bridge_invoices(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled'))
);

-- Enable RLS
ALTER TABLE public.bridge_invoice_payments ENABLE ROW LEVEL SECURITY;

-- Studio owners can view payments for their invoices
CREATE POLICY "Studio owners can view own invoice payments"
  ON public.bridge_invoice_payments
  FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.bridge_invoices
      WHERE studio_id IN (
        SELECT studio_id FROM public.studio_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Clients can view their own payments
CREATE POLICY "Clients can view their payments"
  ON public.bridge_invoice_payments
  FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.bridge_invoices
      WHERE client_id IN (
        SELECT client_id FROM public.client_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Service role can manage payments (webhooks)
CREATE POLICY "Service role can manage payments"
  ON public.bridge_invoice_payments
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes
CREATE INDEX idx_bridge_invoice_payments_invoice_id ON public.bridge_invoice_payments(invoice_id);
CREATE INDEX idx_bridge_invoice_payments_stripe_pi ON public.bridge_invoice_payments(stripe_payment_intent_id);
CREATE INDEX idx_bridge_invoice_payments_stripe_session ON public.bridge_invoice_payments(stripe_checkout_session_id);
CREATE INDEX idx_bridge_invoice_payments_status ON public.bridge_invoice_payments(status);

-- Function to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_year text;
  v_count integer;
  v_number text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  -- Count invoices created this year
  SELECT COUNT(*) INTO v_count
  FROM bridge_invoices
  WHERE extract(year from created_at) = extract(year from now());
  
  -- Format: INV-2025-0001
  v_number := 'INV-' || v_year || '-' || lpad((v_count + 1)::text, 4, '0');
  
  RETURN v_number;
END;
$$;

-- Trigger to auto-assign invoice number on insert
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_insert_bridge_invoice
  BEFORE INSERT ON public.bridge_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invoice_number();

-- Comments
COMMENT ON TABLE public.bridge_invoices IS 'Invoices sent from studio owners to clients through The Bridge';
COMMENT ON TABLE public.bridge_invoice_payments IS 'Payment records linking invoices to Stripe payment objects on connected accounts';
COMMENT ON COLUMN public.bridge_invoices.amount_cents IS 'Invoice amount in cents (e.g., 1000000 = $10,000.00)';
COMMENT ON COLUMN public.bridge_invoices.status IS 'Invoice lifecycle: draft → sent → viewed → paid/overdue/failed';
COMMENT ON COLUMN public.bridge_invoice_payments.stripe_payment_intent_id IS 'Stripe PaymentIntent ID (for direct PI flows)';
COMMENT ON COLUMN public.bridge_invoice_payments.stripe_checkout_session_id IS 'Stripe Checkout Session ID (primary flow for Phase 1)';




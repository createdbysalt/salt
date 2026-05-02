-- Migration: Rename bridge_* tables to portal_*
-- Part of "The Bridge" → "The Table" rebrand
-- Database uses "portal_" prefix for clarity (since "table" is a SQL keyword)

-- Step 1: Rename tables
ALTER TABLE public.bridge_portals RENAME TO portal_portals;
ALTER TABLE public.bridge_invoices RENAME TO portal_invoices;
ALTER TABLE public.bridge_invoice_payments RENAME TO portal_invoice_payments;
ALTER TABLE public.bridge_client_subscriptions RENAME TO portal_client_subscriptions;
ALTER TABLE public.bridge_subscription_invoices RENAME TO portal_subscription_invoices;
ALTER TABLE public.bridge_invoice_access_tokens RENAME TO portal_invoice_access_tokens;

-- Step 2: Rename indexes (PostgreSQL auto-renames some, but explicit is safer)
-- Note: Index names that reference "bridge" should be updated
-- Most indexes are auto-named and will update with table rename

-- Step 3: Rename foreign key constraints (if explicitly named with "bridge")
-- PostgreSQL handles most FK renames automatically with table rename

-- Step 4: Update RLS policies (drop and recreate with new names)
-- portal_portals policies
DROP POLICY IF EXISTS "Studios can manage their own bridge portal" ON public.portal_portals;
CREATE POLICY "Studios can manage their own portal"
  ON public.portal_portals
  FOR ALL
  USING (studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid()))
  WITH CHECK (studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid()));

-- portal_invoices policies
DROP POLICY IF EXISTS "Studios can manage their bridge invoices" ON public.portal_invoices;
CREATE POLICY "Studios can manage their portal invoices"
  ON public.portal_invoices
  FOR ALL
  USING (studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid()))
  WITH CHECK (studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Clients can view their own bridge invoices" ON public.portal_invoices;
CREATE POLICY "Clients can view their own portal invoices"
  ON public.portal_invoices
  FOR SELECT
  USING (client_id IN (
    SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
  ));

-- portal_invoice_payments policies
DROP POLICY IF EXISTS "Studios can view their bridge invoice payments" ON public.portal_invoice_payments;
CREATE POLICY "Studios can view their portal invoice payments"
  ON public.portal_invoice_payments
  FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM public.portal_invoices WHERE studio_id IN (
      SELECT id FROM public.studios WHERE owner_id = auth.uid()
    )
  ));

-- portal_client_subscriptions policies
DROP POLICY IF EXISTS "Studios can manage client subscriptions" ON public.portal_client_subscriptions;
CREATE POLICY "Studios can manage client subscriptions"
  ON public.portal_client_subscriptions
  FOR ALL
  USING (studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid()))
  WITH CHECK (studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.portal_client_subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON public.portal_client_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- portal_subscription_invoices policies
DROP POLICY IF EXISTS "Studios can view subscription invoices" ON public.portal_subscription_invoices;
CREATE POLICY "Studios can view subscription invoices"
  ON public.portal_subscription_invoices
  FOR SELECT
  USING (subscription_id IN (
    SELECT id FROM public.portal_client_subscriptions WHERE studio_id IN (
      SELECT id FROM public.studios WHERE owner_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Service role can manage subscription invoices" ON public.portal_subscription_invoices;
CREATE POLICY "Service role can manage subscription invoices"
  ON public.portal_subscription_invoices
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- portal_invoice_access_tokens policies
DROP POLICY IF EXISTS "Studios can manage invoice tokens" ON public.portal_invoice_access_tokens;
CREATE POLICY "Studios can manage invoice tokens"
  ON public.portal_invoice_access_tokens
  FOR ALL
  USING (invoice_id IN (
    SELECT id FROM public.portal_invoices WHERE studio_id IN (
      SELECT id FROM public.studios WHERE owner_id = auth.uid()
    )
  ))
  WITH CHECK (invoice_id IN (
    SELECT id FROM public.portal_invoices WHERE studio_id IN (
      SELECT id FROM public.studios WHERE owner_id = auth.uid()
    )
  ));

-- Step 5: Update any views that reference bridge tables
-- (Add view updates here if any exist)

-- Step 6: Update any functions that reference bridge tables
-- (Add function updates here if any exist)

COMMENT ON TABLE public.portal_portals IS 'Client portal configuration (formerly bridge_portals). Renamed as part of "The Table" rebrand.';
COMMENT ON TABLE public.portal_invoices IS 'Client-facing invoices (formerly bridge_invoices). Renamed as part of "The Table" rebrand.';
COMMENT ON TABLE public.portal_invoice_payments IS 'Invoice payment records (formerly bridge_invoice_payments). Renamed as part of "The Table" rebrand.';
COMMENT ON TABLE public.portal_client_subscriptions IS 'Client subscription plans (formerly bridge_client_subscriptions). Renamed as part of "The Table" rebrand.';
COMMENT ON TABLE public.portal_subscription_invoices IS 'Subscription invoice records (formerly bridge_subscription_invoices). Renamed as part of "The Table" rebrand.';
COMMENT ON TABLE public.portal_invoice_access_tokens IS 'Secure invoice access tokens (formerly bridge_invoice_access_tokens). Renamed as part of "The Table" rebrand.';

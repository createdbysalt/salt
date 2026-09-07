-- ============================================================================
-- QuickBooks as a second provider for billing capabilities (playbooks Phase 4)
-- ============================================================================
--
-- The capability contract: a capability gains a second provider by inserting
-- a row — no playbook or engine change. With these rows, invoice-reminder /
-- payment-received / payment-reconciliation resolve their fetch and action
-- steps against QuickBooks when a workspace connects it instead of Stripe
-- (priority 20: Stripe stays preferred when both are connected).
--
-- Deliberately NOT mapped: QUICKBOOKS_QUERY_ENTITY. The capability-fetch
-- contract passes generic filter args ({limit: 10}); a free-form query tool
-- needs a `query` string and would fail schema validation at the gate.
-- QUICKBOOKS_GET_INVOICE is likewise unmapped — it requires an invoice id,
-- which a list-style capability fetch never has.
--
-- Idempotent: ON CONFLICT DO NOTHING.
--
-- Rollback:
--   DELETE FROM public.tool_capabilities
--   WHERE provider_key = 'quickbooks'
--     AND capability_key IN ('read_invoices', 'create_invoice');
-- ============================================================================

INSERT INTO public.tool_capabilities (capability_key, tool_slug, provider_key, priority, notes) VALUES
  -- read_invoices: outstanding balances as the invoice list read
  ('read_invoices', 'QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT', 'quickbooks', 20, 'Aged receivables as the outstanding-invoice read; Stripe preferred'),
  -- create_invoice (draft-only per policy; still approval-gated)
  ('create_invoice', 'QUICKBOOKS_CREATE_INVOICE', 'quickbooks', 20, 'Second provider behind Stripe')
ON CONFLICT (capability_key, tool_slug) DO NOTHING;

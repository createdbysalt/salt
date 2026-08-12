-- Finance capture category (producer roadmap track 3).
--
-- Bank transactions are their own capture taxonomy: money IN is the
-- strongest relationship witness in the system, but money OUT must not
-- misclassify as a payment received — routing Mercury through the billing
-- adapter (the 2026-08-06 seed) conflated the two. The finance category
-- adapter (app/_features/capture/adapters/categories/finance.ts) owns
-- transaction normalization with credit/debit semantics.
--
-- 1. Widen the capture_category CHECK to include 'finance'.
-- 2. Move mercury from 'billing' to 'finance'.

ALTER TABLE public.connector_overrides
  DROP CONSTRAINT IF EXISTS connector_overrides_capture_category_check;

ALTER TABLE public.connector_overrides
  ADD CONSTRAINT connector_overrides_capture_category_check
  CHECK (
    capture_category IS NULL OR capture_category IN (
      'email', 'calendar', 'billing', 'crm', 'meetings', 'documents',
      'storage', 'project_management', 'communication', 'finance'
    )
  );

UPDATE public.connector_overrides
SET capture_category = 'finance'
WHERE provider_key = 'mercury';

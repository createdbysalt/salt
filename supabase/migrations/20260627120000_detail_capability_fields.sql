-- Add fields required for detail-page capability readiness.

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

COMMENT ON COLUMN public.people.billing_email IS 'Billing email used for invoices when it differs from the primary email.';
COMMENT ON COLUMN public.people.timezone IS 'Timezone used for scheduling and meeting coordination.';
COMMENT ON COLUMN public.organizations.billing_email IS 'Billing email used for organization invoices.';
COMMENT ON COLUMN public.organizations.last_contact_at IS 'Most recent known interaction with this organization.';

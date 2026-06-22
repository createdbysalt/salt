-- ============================================================================
-- ORGANIZATIONS: domain column for org dedup (system plays, capture)
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS domain TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_studio_domain
  ON public.organizations (studio_id, lower(domain))
  WHERE domain IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_domain
  ON public.organizations (studio_id, domain)
  WHERE domain IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.organizations.domain IS 'Email/web domain for org resolution (e.g. acme.com). Unique per workspace when set.';

-- ============================================================================
-- Workspace Subscriptions (Pricing §1 — capacity tiers)
-- ============================================================================
--
-- Entitlement state for a workspace: which tier it is on, which Stripe
-- subscription backs it, and when the current billing period started.
--
-- WHY THIS IS A SEPARATE TABLE, NOT COLUMNS ON `workspaces`
-- ------------------------------------------------------------------------
-- `workspaces` grants UPDATE to `authenticated`, gated only by
-- `USING (owner_id = auth.uid())` with no WITH CHECK clause
-- (20251228010000_multi_tenant_architecture.sql). Postgres reuses USING as
-- the check when WITH CHECK is omitted, so a workspace owner can PATCH any
-- column on their own row straight through PostgREST with nothing but their
-- session token.
--
-- Putting `tier` or `plays_included` on `workspaces` would therefore let any
-- customer promote themselves to Max with an unlimited bundle. Entitlement
-- lives here instead, where no user-session role holds a write grant.
--
-- WHAT IS DELIBERATELY ABSENT
-- ------------------------------------------------------------------------
-- * No `plays_included` column. Bundle size is derived from `tier` by the
--   server-side catalog in `app/_lib/usage/tiers.ts`. A value that is never
--   stored is a value that cannot be tampered with. `plays_included_override`
--   exists only for grandfathering and enterprise deals.
-- * No `plays_used_this_period` counter. Consumption is aggregated from
--   `usage_events` on read. A mutable counter is both a tamper target and a
--   drift source; deriving it keeps the ledger the single source of truth and
--   makes the G1 reconciliation job trivially correct.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_subscriptions (
  workspace_id UUID PRIMARY KEY
    REFERENCES public.workspaces(id) ON DELETE CASCADE,

  tier TEXT NOT NULL DEFAULT 'starter'
    CHECK (tier IN ('starter', 'pro', 'max', 'enterprise')),

  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN (
      'trialing', 'active', 'past_due', 'canceled', 'paused', 'incomplete'
    )),

  billing_interval TEXT NOT NULL DEFAULT 'month'
    CHECK (billing_interval IN ('month', 'year')),

  -- Stripe linkage. Written only by the signature-verified webhook.
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Period boundaries mirror Stripe so bundle windows and invoices agree.
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,

  -- Grandfathering and enterprise deals only. NULL means "use the catalog".
  plays_included_override INTEGER
    CHECK (plays_included_override IS NULL OR plays_included_override >= 0),

  -- G5: overage is opt-in and never silent. Toggled by a server action that
  -- goes through the service-role client, never by a direct client write.
  overage_enabled BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_stripe_customer
  ON public.workspace_subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_period_end
  ON public.workspace_subscriptions(current_period_end)
  WHERE status IN ('trialing', 'active');

-- ─── Updated_at trigger ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS workspace_subscriptions_updated_at
  ON public.workspace_subscriptions;
CREATE TRIGGER workspace_subscriptions_updated_at
  BEFORE UPDATE ON public.workspace_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;

-- Members may read their own entitlement so the billing UI can render it.
CREATE POLICY "workspace_members_view_subscription"
  ON public.workspace_subscriptions FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- No write policy for `authenticated` by design. Do not add a
-- `workspace_members_manage_workspace_subscriptions` policy — that shape is
-- what the bulk policy loop in 20260625193000 generates for workspace-scoped
-- tables, and applying it here would hand customers their own tier control.
-- Every write goes through service_role in app/_lib/stripe/subscription-sync.ts.

-- ─── Grants ─────────────────────────────────────────────────────────────────

GRANT SELECT ON public.workspace_subscriptions TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.workspace_subscriptions FROM authenticated;
REVOKE ALL ON public.workspace_subscriptions FROM anon;

-- ─── Backfill ───────────────────────────────────────────────────────────────
-- Every existing workspace starts on the Starter default so entitlement reads
-- never have to handle a missing row.

INSERT INTO public.workspace_subscriptions (workspace_id, tier, status)
SELECT w.id, 'starter', 'trialing'
FROM public.workspaces w
ON CONFLICT (workspace_id) DO NOTHING;

-- ─── Comments ───────────────────────────────────────────────────────────────

COMMENT ON TABLE public.workspace_subscriptions IS
  'Workspace entitlement state. Service-role writes only — deliberately not columns on `workspaces`, which grants UPDATE to owners via PostgREST.';
COMMENT ON COLUMN public.workspace_subscriptions.plays_included_override IS
  'Grandfathering and enterprise only. NULL means derive the bundle from `tier` via app/_lib/usage/tiers.ts.';
COMMENT ON COLUMN public.workspace_subscriptions.overage_enabled IS
  'G5: overage never accrues without an explicit prior opt-in.';

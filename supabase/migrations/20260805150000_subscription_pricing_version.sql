-- Pin each workspace to the pricing version it signed up under.
--
-- Without this column, editing a bundle size or price in `app/_lib/usage/
-- pricing-versions.ts` silently re-prices every existing workspace on that
-- tier. The pricing proposal (§4) commits to resetting bundles after 60-90
-- days of shadow metering and grandfathering the launch cohort, which is not
-- expressible against a single mutable catalog.
--
-- With it, changing pricing means adding a version in code and bumping
-- CURRENT_PRICING_VERSION. Existing rows keep pointing at the version they
-- were sold, so grandfathering is the default rather than a backfill someone
-- has to remember. Migrating a cohort becomes one explicit UPDATE.
--
-- Deliberately a free-text column rather than an enum: pricing versions are
-- added often and an enum would demand a migration for each one. The set of
-- valid ids lives in code; `getPricingVersion()` logs loudly on an unknown
-- value rather than guessing.

alter table public.workspace_subscriptions
  add column if not exists pricing_version text not null default '2026-08';

comment on column public.workspace_subscriptions.pricing_version is
  'Pricing version this workspace is billed under. Matches a key in app/_lib/usage/pricing-versions.ts. Never mutate on a live subscription without an explicit migration decision — it changes what the customer is entitled to.';

-- Existing rows predate versioning and were all sold launch pricing.
update public.workspace_subscriptions
  set pricing_version = '2026-08'
  where pricing_version is null;

-- Cohort reporting: "how many workspaces are still on launch pricing?"
create index if not exists workspace_subscriptions_pricing_version_idx
  on public.workspace_subscriptions (pricing_version);

-- No RLS change. This table grants no write to `authenticated`; entitlement is
-- service-role-only, and pricing_version is the most sensitive column on it.

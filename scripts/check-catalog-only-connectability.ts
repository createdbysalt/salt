/**
 * Sources plan 5.5 — catalog_only connectability probe (read-only).
 *
 * Reports:
 *   1. catalog_only connectors that carry a resolved auth config (i.e. were
 *      connectable before the tier gate)
 *   2. existing workspace_integrations rows for catalog_only providers
 *      (would the gate strand any live connections?)
 *
 * Run: op run --env-file=.env.staging.1password -- pnpm tsx scripts/check-catalog-only-connectability.ts
 */

import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} not set — run via op run --env-file=.env.staging.1password`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );

  const { data: overrides, error } = await supabase
    .from("connector_overrides")
    .select("provider_key, tier, auth_config_id, auth_config_env_var, capture_category, ask_salt_slug_prefix");
  if (error) throw new Error(error.message);

  const rows = overrides ?? [];
  const byTier = new Map<string, number>();
  for (const row of rows) {
    byTier.set(row.tier, (byTier.get(row.tier) ?? 0) + 1);
  }
  console.log("overrides by tier:", Object.fromEntries(byTier));

  const catalogOnlyWithAuth = rows.filter(
    (row) => row.tier === "catalog_only" && (row.auth_config_id || row.auth_config_env_var),
  );
  console.log(`\ncatalog_only WITH auth config (were connectable): ${catalogOnlyWithAuth.length}`);
  for (const row of catalogOnlyWithAuth) {
    console.log(`  ${row.provider_key} (auth_config_id=${row.auth_config_id ?? "env:" + row.auth_config_env_var})`);
  }

  // catalog_only = default tier; providers with NO override row are also
  // catalog_only but have no pinned auth config, so they were never
  // connectable unless an env var resolves. List overrides-free catalog
  // providers with env vars? Not knowable here — env vars live in 1Password.

  // Tier sanity: catalog_only rows that actually carry capture or Ask Salt
  // capability (tier drift — the gate would neuter a working connector).
  const drifted = rows.filter(
    (row) =>
      row.tier === "catalog_only" &&
      (row.capture_category || row.ask_salt_slug_prefix),
  );
  console.log(`\ncatalog_only WITH capture_category or ask_salt prefix (tier drift): ${drifted.length}`);
  for (const row of drifted) {
    console.log(`  ${row.provider_key} capture_category=${row.capture_category ?? "-"} ask_salt=${row.ask_salt_slug_prefix ?? "-"}`);
  }

  const catalogOnlyProviders = rows
    .filter((row) => row.tier === "catalog_only")
    .map((row) => row.provider_key);
  if (catalogOnlyProviders.length > 0) {
    const { data: connections, error: connError } = await supabase
      .from("workspace_integrations")
      .select("provider, workspace_id, is_active, composio_status")
      .in("provider", catalogOnlyProviders);
    if (connError) throw new Error(connError.message);
    console.log(`\nexisting connections to catalog_only providers: ${connections?.length ?? 0}`);
    for (const conn of connections ?? []) {
      console.log(`  ${conn.provider} ws=${conn.workspace_id} active=${conn.is_active} status=${conn.composio_status}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

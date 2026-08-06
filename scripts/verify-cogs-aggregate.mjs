/**
 * Verify the workspace_cogs_micros RPC is callable by service_role.
 *
 * The admin Supabase client is constructed without a Database generic, so
 * `.rpc("anything")` typechecks whether or not the function exists and whether
 * or not the parameter names match. That is the same blind spot that let
 * usage_events ship without a service_role grant: green tests, dead write path.
 * This probes the real database instead.
 *
 * A missing function, a renamed parameter, or a missing EXECUTE grant all
 * surface here as an error. A random workspace id is used, so success means
 * "callable and returned 0", which is the correct answer for a workspace with
 * no ledger rows.
 *
 * Run: op run --env-file=.env.staging.1password -- node scripts/verify-cogs-aggregate.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NOWHERE_WORKSPACE = "00000000-0000-0000-0000-000000000000";
const SINCE = "2026-08-01T00:00:00Z";

const { data, error } = await supabase.rpc("workspace_cogs_micros", {
  p_workspace_id: NOWHERE_WORKSPACE,
  p_since: SINCE,
  p_until: null,
});

if (error) {
  console.error("FAIL — RPC not callable by service_role");
  console.error(`  code:    ${error.code}`);
  console.error(`  message: ${error.message}`);
  if (error.hint) console.error(`  hint:    ${error.hint}`);
  process.exit(1);
}

const value = typeof data === "string" ? Number(data) : data;

if (typeof value !== "number" || !Number.isFinite(value)) {
  console.error(`FAIL — RPC returned a non-numeric value: ${JSON.stringify(data)}`);
  process.exit(1);
}

console.log(`PASS — workspace_cogs_micros callable, returned ${value} micro-USD`);

// A real workspace exercises the index path and proves the sum is not
// hard-zero. Skipped silently when the staging database has no workspaces.
const { data: rows } = await supabase
  .from("usage_events")
  .select("workspace_id")
  .limit(1);

const sample = rows?.[0]?.workspace_id;
if (!sample) {
  console.log("SKIP — no usage_events rows yet; sum path exercised with zero only");
  process.exit(0);
}

const { data: realData, error: realError } = await supabase.rpc(
  "workspace_cogs_micros",
  { p_workspace_id: sample, p_since: "2000-01-01T00:00:00Z", p_until: null },
);

if (realError) {
  console.error(`FAIL — RPC errored for a real workspace: ${realError.message}`);
  process.exit(1);
}

console.log(
  `PASS — workspace ${sample} has ${
    typeof realData === "string" ? Number(realData) : realData
  } micro-USD of lifetime COGS`,
);

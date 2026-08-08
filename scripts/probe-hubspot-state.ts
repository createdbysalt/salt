/**
 * One-off probe: HubSpot connector state on the linked Supabase env.
 * Run: op run --env-file=.env.staging.1password -- pnpm tsx scripts/probe-hubspot-state.ts
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: o, error: oe } = await s
    .from("connector_overrides")
    .select("provider_key, tier, capture_category, auth_config_id, ask_salt_slug_prefix")
    .eq("provider_key", "hubspot");
  console.log("override:", JSON.stringify(o), oe?.message ?? "");
  const { data: t, error: te } = await s
    .from("connector_trigger_types")
    .select("trigger_slug, enabled_for_capture, sync_status")
    .eq("toolkit_slug", "hubspot");
  console.log("triggers:", JSON.stringify(t), te?.message ?? "");
  const { data: w, error: we } = await s
    .from("workspace_integrations")
    .select("workspace_id, created_at")
    .eq("provider", "hubspot");
  console.log("connections:", JSON.stringify(w), we?.message ?? "");
}

main();

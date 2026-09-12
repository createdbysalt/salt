/**
 * One-off: count gmail captures for a workspace + oldest capture date.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/check-gmail-gate.ts <workspace-id>
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error("usage: check-gmail-gate.ts <workspace-id>");
  process.exit(1);
}

async function main() {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("capture_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("source_type", "gmail");
  if (error) throw error;
  const { data: oldest } = await supabase
    .from("capture_events")
    .select("created_at")
    .eq("workspace_id", workspaceId)
    .eq("source_type", "gmail")
    .order("created_at", { ascending: true })
    .limit(1);
  console.log(`gmail captures: ${count} | oldest: ${oldest?.[0]?.created_at ?? "?"}`);
}

main().catch((error) => {
  console.error("fatal:", error);
  process.exit(1);
});

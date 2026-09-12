/**
 * One-off (2026-09-08): dismiss unresolved work-field evidence parked by the
 * FIRST (buggy) work-synthesis run — meeting-title names like "CLC x SALT"
 * and crossed-identity generics. Left unresolved, they could aggregate over
 * the bar and auto-apply later. Rows from the fixed run (after the 22:18
 * reverts) are kept.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/dismiss-stale-work-evidence.ts <workspace-id> [--dry-run]
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const workspaceId = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!workspaceId) {
  console.error("usage: dismiss-stale-work-evidence.ts <workspace-id> [--dry-run]");
  process.exit(1);
}

// The fixed pipeline's first run started after the reverts at ~22:18 UTC.
const FIXED_RUN_START = "2026-09-08T22:20:00.000Z";

async function main() {
  const supabase = createAdminClient();

  const { data: stale, error } = await supabase
    .from("entity_evidence")
    .select("id, entity_id, field_path, proposed_value, created_at")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", "work")
    .is("resolved_at", null)
    .lt("created_at", FIXED_RUN_START);
  if (error) throw error;

  console.log(`[dismiss] ${(stale ?? []).length} stale unresolved row(s)`);
  for (const row of stale ?? []) {
    console.log(
      `[dismiss] ${String(row.created_at).slice(0, 16)} | ${row.field_path} = ${JSON.stringify(row.proposed_value)}`,
    );
  }
  if (dryRun || (stale ?? []).length === 0) return;

  const { error: updateError } = await supabase
    .from("entity_evidence")
    .update({
      resolved_at: new Date().toISOString(),
      resolution: "dismissed",
      resolution_details: {
        reason:
          "Parked by the first work-synthesis run (meeting-title / crossed-identity naming); superseded by the deliverable-only convention",
      },
    })
    .eq("workspace_id", workspaceId)
    .in("id", (stale ?? []).map((row) => row.id));
  if (updateError) throw updateError;
  console.log("[dismiss] done");
}

main().catch((error) => {
  console.error("[dismiss] fatal:", error);
  process.exit(1);
});

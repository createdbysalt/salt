/**
 * One-off debug (2026-09-11): run analyzeResourceContent against one
 * ingested PDF resource and print the full result — the sweep's resources
 * landed bytes but analyzed=false, and the service swallows the reason.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/debug-invoice-reminder.ts <workspace-id>
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { analyzeResourceContent } from "@/app/_features/resources/services/content-analysis";

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error("usage: debug-invoice-reminder.ts <workspace-id>");
  process.exit(1);
}

async function main() {
  const supabase = createAdminClient();
  const { data: resource, error } = await supabase
    .from("resources")
    .select("id, file_name")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .not("bucket_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  console.log(`analyzing: ${resource.file_name} (${resource.id})`);

  const result = await analyzeResourceContent({
    workspaceId,
    resourceId: resource.id,
    force: true,
  });
  console.log("result:", JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("fatal:", error);
  process.exit(1);
});

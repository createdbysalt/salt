/**
 * One-off (2026-09-08): clear work_synthesis markers for a workspace so the
 * fixed naming pass (deliverable-only convention + identity-first orphan
 * fallback) re-reads every record instead of respecting the week throttle
 * from the first, buggy run.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/clear-work-synthesis-markers.ts <workspace-id>
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error("usage: clear-work-synthesis-markers.ts <workspace-id>");
  process.exit(1);
}

async function main() {
  const supabase = createAdminClient();
  const { data: works, error } = await supabase
    .from("work")
    .select("id, name, metadata")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);
  if (error) throw error;

  let cleared = 0;
  for (const work of works ?? []) {
    const metadata = (work.metadata ?? {}) as Record<string, unknown>;
    if (!metadata.work_synthesis) continue;
    const next = { ...metadata };
    delete next.work_synthesis;
    const { error: updateError } = await supabase
      .from("work")
      .update({ metadata: next })
      .eq("id", work.id)
      .eq("workspace_id", workspaceId);
    if (updateError) throw updateError;
    cleared++;
    console.log(`[clear] ${work.name} (${work.id.slice(0, 8)})`);
  }
  console.log(`[clear] cleared ${cleared} marker(s)`);
}

main().catch((error) => {
  console.error("[clear] fatal:", error);
  process.exit(1);
});

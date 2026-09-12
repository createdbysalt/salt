/**
 * One-off inspect: parked (Watching) work-field proposals from the latest
 * work-synthesis run — entity_evidence rows for work records.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/inspect-work-parked.ts <workspace-id>
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error("usage: inspect-work-parked.ts <workspace-id>");
  process.exit(1);
}

async function main() {
  const supabase = createAdminClient();

  const { data: evidence, error } = await supabase
    .from("entity_evidence")
    .select("entity_id, field_path, proposed_value, confidence, resolved_at, created_at")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", "work")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;

  const { data: works } = await supabase
    .from("work")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);
  const nameOf = (id: string) =>
    (works ?? []).find((w) => w.id === id)?.name ?? id.slice(0, 8);

  console.log("--- work field evidence (newest first) ---");
  for (const row of evidence ?? []) {
    console.log(
      `${String(row.created_at).slice(0, 16)} | ${row.resolved_at ? "resolved" : "watching"} | ${nameOf(row.entity_id)} | ${row.field_path} = ${JSON.stringify(row.proposed_value)} | conf ${row.confidence}`,
    );
  }
}

main().catch((error) => {
  console.error("[inspect] fatal:", error);
  process.exit(1);
});

/**
 * Inspect parked (Watching) rename proposals for work records — what the
 * synthesis pass proposed but didn't auto-apply.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/inspect-work-name-proposals.ts <workspace-id>
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error("usage: inspect-work-name-proposals.ts <workspace-id>");
  process.exit(1);
}

async function main() {
  const supabase = createAdminClient();

  const { data: evidence, error } = await supabase
    .from("pending_evidence")
    .select("id, identifier, status, log_odds_score, extracted_fields, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;

  for (const row of evidence ?? []) {
    const fields = (row.extracted_fields ?? {}) as Record<string, unknown>;
    const nameField = fields.name as Record<string, unknown> | undefined;
    if (!nameField) continue;
    console.log(
      `${String(row.created_at).slice(0, 16)} | ${row.status} | ${row.identifier} | proposed name: ${JSON.stringify(nameField.value ?? nameField)} | score ${row.log_odds_score}`,
    );
  }
}

main().catch((error) => {
  console.error("[inspect] fatal:", error);
  process.exit(1);
});

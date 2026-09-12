/**
 * One-off check: what evidence exists for david@example.org (the record now
 * named "Logo Design"), and whether any agreement/SOW resources exist in
 * the workspace at all.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/debug-invoice-reminder.ts <workspace-id>
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error("usage: debug-invoice-reminder.ts <workspace-id>");
  process.exit(1);
}

async function main() {
  const supabase = createAdminClient();

  console.log("--- captures involving david@example.org ---");
  const { data: captures, error } = await supabase
    .from("capture_events")
    .select("source_type, extracted_data, created_at")
    .eq("workspace_id", workspaceId)
    .or(
      "extracted_data->>sender_email.ilike.%david@example.org%,extracted_data->>to.ilike.%david@example.org%",
    )
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  for (const c of captures ?? []) {
    const ex = (c.extracted_data ?? {}) as Record<string, unknown>;
    const attachments = Array.isArray(ex.attachments)
      ? ex.attachments
          .map((a) => (typeof a === "string" ? a : ((a as Record<string, unknown>).name ?? (a as Record<string, unknown>).filename ?? "?")))
          .join(", ")
      : "";
    console.log(
      `[${c.source_type}] ${String(c.created_at).slice(0, 10)} | ${ex.subject ?? "(no subject)"}${attachments ? ` | attachments: ${attachments}` : ""}`,
    );
    if (ex.snippet) console.log(`    snippet: ${String(ex.snippet).slice(0, 140)}`);
  }

  console.log("\n--- all resources in workspace (filenames) ---");
  const { data: resources, error: resError } = await supabase
    .from("resources")
    .select("file_name, created_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(30);
  if (resError) throw resError;
  for (const r of resources ?? []) {
    console.log(`${String(r.created_at).slice(0, 10)} | ${r.file_name}`);
  }
}

main().catch((error) => {
  console.error("[check] fatal:", error);
  process.exit(1);
});

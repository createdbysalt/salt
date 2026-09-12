/**
 * One-off audit (2026-09-08): captures carrying attachment metadata vs
 * resources actually created, and whether email-born resources have any
 * legible content (source_excerpt / ai_summary / storage bytes).
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/audit-account-plays.ts <workspace-id>
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error("usage: audit-account-plays.ts <workspace-id>");
  process.exit(1);
}

const DOC_PATTERN =
  /agreement|contract|sow|statement of work|proposal|quote|invoice|scope/i;

async function main() {
  const supabase = createAdminClient();

  // Captures with attachment metadata.
  const { data: captures, error } = await supabase
    .from("capture_events")
    .select("id, source_type, extracted_data, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  let withAttachments = 0;
  let withDocAttachments = 0;
  const docCaptures: Array<{ date: string; subject: string; names: string[] }> = [];
  for (const capture of captures ?? []) {
    const ex = (capture.extracted_data ?? {}) as Record<string, unknown>;
    const attachments = Array.isArray(ex.attachments) ? ex.attachments : [];
    if (attachments.length === 0) continue;
    withAttachments++;
    const names = attachments.map((a) =>
      typeof a === "string"
        ? a
        : String((a as Record<string, unknown>).name ?? (a as Record<string, unknown>).filename ?? "?"),
    );
    const docNames = names.filter((n) => DOC_PATTERN.test(n) || /\.(pdf|docx?)$/i.test(n));
    if (docNames.length > 0) {
      withDocAttachments++;
      docCaptures.push({
        date: String(capture.created_at).slice(0, 10),
        subject: String(ex.subject ?? "(no subject)"),
        names: docNames,
      });
    }
  }

  console.log(`captures scanned: ${(captures ?? []).length}`);
  console.log(`with attachments: ${withAttachments}`);
  console.log(`with document-class attachments (pdf/doc/agreement/…): ${withDocAttachments}`);
  for (const row of docCaptures.slice(0, 20)) {
    console.log(`  ${row.date} | ${row.subject} | ${row.names.join(", ")}`);
  }

  // Resources: how were they born, and do they have legible content?
  const { data: resources, error: resError } = await supabase
    .from("resources")
    .select("id, file_name, source, created_by_system, bucket_id, object_path, ai_summary, extracted_data, capture_event_id, created_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (resError) throw resError;

  console.log(`\nresources: ${(resources ?? []).length}`);
  for (const resource of resources ?? []) {
    const ex = (resource.extracted_data ?? {}) as Record<string, unknown>;
    const hasBytes = Boolean(resource.bucket_id && resource.object_path);
    const hasExcerpt = typeof ex.source_excerpt === "string" && ex.source_excerpt.length > 0;
    const hasAnalysis = Boolean((ex.content_analysis as Record<string, unknown> | undefined)?.analyzed_at);
    const hasSummary = Boolean(resource.ai_summary);
    console.log(
      `  ${String(resource.created_at).slice(0, 10)} | ${resource.file_name} | source=${resource.source ?? "?"} system=${resource.created_by_system ?? false} | bytes=${hasBytes} excerpt=${hasExcerpt} analysis=${hasAnalysis} summary=${hasSummary} capture=${resource.capture_event_id ? "linked" : "—"}`,
    );
  }
}

main().catch((error) => {
  console.error("[audit] fatal:", error);
  process.exit(1);
});

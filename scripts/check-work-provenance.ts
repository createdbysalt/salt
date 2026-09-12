/**
 * One-off verify (2026-09-09): show the resources born from email-attachment
 * ingestion — bytes present, content-analysis results (category, document
 * type, description, amounts), and entity links.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/check-work-provenance.ts <workspace-id>
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error("usage: check-work-provenance.ts <workspace-id>");
  process.exit(1);
}

async function main() {
  const supabase = createAdminClient();
  const { data: resources, error } = await supabase
    .from("resources")
    .select("id, file_name, mime_type, size_bytes, bucket_id, object_path, category, document_type, description, extracted_data, created_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .not("bucket_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  console.log(`resources with bytes: ${(resources ?? []).length}\n`);
  for (const resource of resources ?? []) {
    const ex = (resource.extracted_data ?? {}) as Record<string, unknown>;
    const analysis = ex.content_analysis as { analyzed_at?: string } | undefined;
    console.log(`📄 ${resource.file_name}`);
    console.log(`   ${resource.mime_type} | ${Math.round((resource.size_bytes ?? 0) / 1024)}KB | analyzed=${Boolean(analysis?.analyzed_at)}`);
    console.log(`   category=${resource.category ?? "—"} | document_type=${resource.document_type ?? "—"}`);
    if (resource.description) console.log(`   ${String(resource.description).slice(0, 220)}`);

    const { data: links } = await supabase
      .from("entity_links")
      .select("target_type, target_id")
      .eq("workspace_id", workspaceId)
      .eq("source_type", "resource")
      .eq("source_id", resource.id);
    for (const link of links ?? []) {
      const table = link.target_type === "work" ? "work" : link.target_type === "billing" ? "billing_records" : null;
      if (!table) continue;
      const { data: target } = await supabase.from(table).select("name").eq("id", link.target_id).maybeSingle();
      console.log(`   → ${link.target_type}: ${target?.name ?? link.target_id}`);
    }
    console.log();
  }
}

main().catch((error) => {
  console.error("fatal:", error);
  process.exit(1);
});

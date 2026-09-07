#!/usr/bin/env npx tsx
/**
 * Check tool_classifications rows for the email tool slugs involved in the
 * failed invoice-reminder send.
 *
 * Run: op run --env-file=.env.staging.1password -- pnpm tsx scripts/check-tool-classifications.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const slugs = [
    "GMAIL_SEND_EMAIL",
    "GMAIL_CREATE_EMAIL_DRAFT",
    "GMAIL_MODIFY_MESSAGE_LABELS",
    "OUTLOOK_SEND_EMAIL",
  ];
  const { data, error } = await supabase
    .from("tool_classifications")
    .select("tool_slug, risk, requires_human_confirmation, status, disabled_reason, notes, updated_at")
    .in("tool_slug", slugs);
  if (error) throw error;
  console.log("=== rows for email slugs ===");
  console.log(JSON.stringify(data, null, 2));

  // What does the synced catalog think about GMAIL_SEND_EMAIL right now?
  const { data: catalogRows, error: catError } = await supabase
    .from("connector_tools")
    .select("tool_slug, sync_status, schema_hash, updated_at")
    .in("tool_slug", slugs);
  if (catError) throw catError;
  console.log("=== connector_tools (synced catalog) ===");
  console.log(JSON.stringify(catalogRows, null, 2));

  const { count } = await supabase
    .from("tool_classifications")
    .select("*", { count: "exact", head: true });
  console.log("total rows:", count);

  const { data: statuses } = await supabase
    .from("tool_classifications")
    .select("status");
  const counts: Record<string, number> = {};
  for (const r of statuses ?? []) {
    counts[r.status as string] = (counts[r.status as string] ?? 0) + 1;
  }
  console.log("status breakdown:", counts);

  // How many classifications are disabled right now, and which are they?
  const { data: disabled, count: disabledCount } = await supabase
    .from("tool_classifications")
    .select("tool_slug, risk, updated_at", { count: "exact" })
    .eq("status", "disabled")
    .order("updated_at", { ascending: false });
  console.log(`\n=== disabled classifications: ${disabledCount} ===`);
  for (const r of disabled ?? []) {
    console.log(`- ${r.tool_slug} (${r.risk}) disabled at ${r.updated_at}`);
  }

  // The sync event that disabled GMAIL_SEND_EMAIL
  const { data: syncEvents } = await supabase
    .from("connector_sync_events")
    .select("kind, subject_slug, detail, created_at")
    .eq("subject_slug", "GMAIL_SEND_EMAIL")
    .order("created_at", { ascending: false })
    .limit(10);
  console.log("\n=== sync events for GMAIL_SEND_EMAIL ===");
  console.log(JSON.stringify(syncEvents, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

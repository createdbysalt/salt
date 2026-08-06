/**
 * Phase E spot check (capture quality repair): for each source_type present
 * in capture_events, pull the most recent row and report which detail-contract
 * fields (docs/architecture/capture-detail-contract.md) are populated.
 *
 * Run against staging:
 *   op run --env-file=.env.staging.1password -- pnpm tsx scripts/spot-check-capture-contract.ts
 *
 * Read-only. Rows ingested before the Phase D adapters shipped won't carry the
 * new fields — the report flags those as "pre-contract row" via created_at.
 */
import { createClient } from "@supabase/supabase-js";

const CONTRACT: Record<string, string[]> = {
  gmail: ["subject", "sender_email", "thread_id", "deep_link"],
  outlook: ["subject", "sender_email", "thread_id", "deep_link"],
  googlecalendar: ["summary", "start", "organizer_email"],
  outlook_calendar: ["title", "start"],
  cal: ["title", "start", "status"],
  calendly: ["title", "start"],
  stripe: ["amount", "currency", "status", "event_type"],
  quickbooks: ["amount", "currency", "invoice_number"],
  googledrive: ["file_name", "web_view_link", "owner_email"],
  dropbox: ["file_name", "folder_path", "file_size"],
  onedrive: ["file_name", "folder_path", "owner_email"],
  slack: ["text", "channel_type", "sender_id"],
  hubspot: ["object_id"],
  pipedrive: ["entity_type", "entity_name"],
  fireflies: ["duration_minutes", "participants", "summary", "action_items"],
  notion: ["event_type"],
  googledocs: ["title", "url"],
  googlesheets: ["title", "url"],
  googleslides: ["event_type"],
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  console.log(`Project: ${url}`);
  const supabase = createClient(url, key);

  const { data: sourceRows, error: sourceError } = await supabase
    .from("capture_events")
    .select("source_type")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (sourceError) throw sourceError;

  const sourceTypes = [...new Set((sourceRows ?? []).map((r) => r.source_type))];
  console.log(`Source types with rows: ${sourceTypes.join(", ") || "(none)"}\n`);

  for (const sourceType of sourceTypes.sort()) {
    const { data, error } = await supabase
      .from("capture_events")
      .select("id, created_at, title, gate_action, extracted_data")
      .eq("source_type", sourceType)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) {
      console.log(`${sourceType}: query error — ${error.message}`);
      continue;
    }
    const row = data?.[0];
    if (!row) continue;

    const extracted = (row.extracted_data ?? {}) as Record<string, unknown>;
    const fields = CONTRACT[sourceType];
    console.log(`── ${sourceType} ─ latest row ${row.id}`);
    console.log(`   created_at=${row.created_at}  gate_action=${row.gate_action ?? "null"}  title=${JSON.stringify(row.title)}`);
    if (!fields) {
      console.log(`   (no contract defined — extracted keys: ${Object.keys(extracted).join(", ") || "none"})`);
      continue;
    }
    const present: string[] = [];
    const missing: string[] = [];
    for (const field of fields) {
      const value = extracted[field];
      if (value === undefined || value === null) missing.push(field);
      else present.push(`${field}=${JSON.stringify(value).slice(0, 60)}`);
    }
    for (const line of present) console.log(`   ✓ ${line}`);
    if (missing.length > 0) {
      console.log(`   ✗ missing: ${missing.join(", ")}`);
      console.log(`   extracted keys on row: ${Object.keys(extracted).join(", ") || "none"}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

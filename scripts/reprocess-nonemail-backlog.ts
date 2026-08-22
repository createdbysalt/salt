/**
 * Non-email capture backlog mop-up (audit follow-up, 2026-08-17).
 *
 * The daily intelligence scan only processes email captures (gmail/outlook
 * message/thread). Non-email captures written before the terminal-stamping
 * fix (audit #7) rest with no `extracted_data.intelligence` outcome and show
 * as "Processing" in Sources → Activity forever.
 *
 * Two groups:
 *   A) gate-visible non-email rows (Drive files, Calendar meetings, …) are
 *      run through the evidence lane (processCaptureForEvidence) so they get
 *      TODAY's behavior — meetings auto-create from calendar facts, files
 *      emit resource/work proposals — then stamped routed/no_signal.
 *   B) noise-gated rows (any type) are stamped no_signal — the admission
 *      gate's noise verdict is final and the scan skips them by design.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- ./node_modules/.bin/tsx \
 *     --tsconfig scripts/tsconfig.json scripts/reprocess-nonemail-backlog.ts            # dry run
 *   op run --env-file=.env.staging.1password -- ./node_modules/.bin/tsx \
 *     --tsconfig scripts/tsconfig.json scripts/reprocess-nonemail-backlog.ts --apply
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Injected env (op run) wins over .env.local — dotenv never overrides.
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const supabase = createClient(supabaseUrl, supabaseKey);

const EMAIL_SOURCES = ["gmail", "outlook"];
const EMAIL_TYPES = ["message", "thread"];

interface BacklogRow {
  id: string;
  workspace_id: string;
  source_type: string;
  capture_type: string;
  gate_action: string | null;
  title: string | null;
  created_at: string;
}

function isEmailScannable(row: BacklogRow): boolean {
  return EMAIL_SOURCES.includes(row.source_type) && EMAIL_TYPES.includes(row.capture_type);
}

async function fetchBacklog(): Promise<BacklogRow[]> {
  const rows: BacklogRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("capture_events")
      .select("id, workspace_id, source_type, capture_type, gate_action, title, created_at")
      .is("extracted_data->intelligence", null)
      .neq("state", "dismissed")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("QUERY FAILED:", error.message);
      process.exit(1);
    }
    rows.push(...((data ?? []) as BacklogRow[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function main() {
  console.log(`Target: ${new URL(supabaseUrl).host}`);
  console.log(apply ? "MODE: APPLY (writes enabled)\n" : "MODE: DRY RUN (pass --apply to write)\n");

  const backlog = await fetchBacklog();

  const groupA = backlog.filter(
    (row) =>
      !isEmailScannable(row) &&
      row.gate_action !== "noise" &&
      row.gate_action !== "drop" &&
      row.gate_action !== "held",
  );
  const groupB = backlog.filter((row) => row.gate_action === "noise");
  const outOfScope = backlog.length - groupA.length - groupB.length;

  console.log(
    `Backlog: ${backlog.length} unstamped — ${groupA.length} to reprocess (evidence lane), ` +
      `${groupB.length} noise-gated to stamp no_signal, ${outOfScope} out of scope (email — the scan owns those).\n`,
  );

  if (!apply) {
    const byKind = new Map<string, number>();
    for (const row of groupA) {
      const key = `${row.source_type}/${row.capture_type}`;
      byKind.set(key, (byKind.get(key) ?? 0) + 1);
    }
    console.log("Group A breakdown:");
    for (const [kind, count] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count.toString().padStart(4)}  ${kind}`);
    }
    console.log("\nDry run complete — pass --apply to process.");
    return;
  }

  // Late imports: app modules pull "server-only" (stubbed via
  // scripts/tsconfig.json) and read env at call time.
  const { processCaptureForEvidence } = await import(
    "@/app/_features/memory/evidence/process-capture"
  );
  const { persistCaptureIntelligenceOutcome } = await import(
    "@/app/_features/capture/services/intelligence/capture-intelligence-persistence"
  );

  let routed = 0;
  let noSignal = 0;
  let failed = 0;

  for (const [index, row] of groupA.entries()) {
    const label = `${row.source_type}/${row.capture_type} ${row.title ?? row.id}`;
    try {
      const result = await processCaptureForEvidence(row.id);
      const outcome = result.signalsDetected > 0 ? "routed" : "no_signal";
      await persistCaptureIntelligenceOutcome(
        supabase as SupabaseClient,
        row.id,
        outcome,
      );
      if (outcome === "routed") routed++;
      else noSignal++;
      console.log(
        `[${index + 1}/${groupA.length}] ${outcome.padEnd(9)} (${result.signalsDetected} signals) ${label}`,
      );
    } catch (error) {
      failed++;
      console.log(
        `[${index + 1}/${groupA.length}] FAILED    ${label}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  for (const row of groupB) {
    try {
      await persistCaptureIntelligenceOutcome(
        supabase as SupabaseClient,
        row.id,
        "no_signal",
      );
      noSignal++;
    } catch (error) {
      failed++;
      console.log(`FAILED noise-stamp ${row.id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(
    `\nDone — ${routed} routed to Memory, ${noSignal} stamped no_signal (incl. ${groupB.length} noise-gated), ${failed} failed.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

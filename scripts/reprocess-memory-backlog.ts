/**
 * Memory repair backlog reprocessing (memory-system repair, Phase 6 — 2026-08-29).
 *
 * Three passes over captures that predate the Phase 2/3 fixes:
 *
 *   A) Drive files (googledrive/file) → processCaptureForEvidence, so they
 *      get today's file classification (resource/work signals, solopreneur
 *      documents). Captures that already contributed evidence signals are
 *      skipped — re-adding the same signal would inflate log-odds scores.
 *      Pass --reprocess-all to force.
 *   B) Stripe payments (stripe/payment) → produceBillingRecordSignals with
 *      the envelope rebuilt from stored extracted_data. The stale rows carry
 *      amount=0 with the real total in amount_due (the old adapter didn't
 *      do the amount_due fallback), so the rebuild mirrors the current
 *      adapter: amount = amount || amount_due. The producer is idempotent
 *      (matches on source_external_id / invoice number) — safe to re-run.
 *   C) Held Outlook mail → runHeldIntentDiscovery (cheap, metered
 *      cold-intent reads; canSpend-gated and fail-neutral by design).
 *      Bounded by --max-reads (default 50).
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- ./node_modules/.bin/tsx \
 *     --tsconfig scripts/tsconfig.json scripts/reprocess-memory-backlog.ts            # dry run
 *   op run --env-file=.env.staging.1password -- ./node_modules/.bin/tsx \
 *     --tsconfig scripts/tsconfig.json scripts/reprocess-memory-backlog.ts --apply
 *
 * Flags: --reprocess-all  --max-reads=N  --lookback-days=N (default 90)
 *        --only=drive|stripe|held
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
const reprocessAll = process.argv.includes("--reprocess-all");
const flagValue = (name: string): number | null => {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? Number(arg.split("=")[1]) : null;
};
const maxReads = flagValue("max-reads") ?? 50;
const lookbackDays = flagValue("lookback-days") ?? 90;
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1] : null;
const want = (part: "drive" | "stripe" | "held") => !only || only === part;

const supabase = createClient(supabaseUrl, supabaseKey);

interface CaptureRow {
  id: string;
  workspace_id: string;
  source_type: string;
  capture_type: string;
  source_external_id: string | null;
  title: string | null;
  created_at: string;
  extracted_data: Record<string, unknown> | null;
  raw_payload: Record<string, unknown> | null;
}

async function fetchCaptures(
  sourceType: string,
  captureType: string,
): Promise<CaptureRow[]> {
  const rows: CaptureRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("capture_events")
      .select(
        "id, workspace_id, source_type, capture_type, source_external_id, title, created_at, extracted_data, raw_payload",
      )
      .eq("source_type", sourceType)
      .eq("capture_type", captureType)
      .neq("state", "dismissed")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error(`QUERY FAILED (${sourceType}/${captureType}): ${error.message}`);
      process.exit(1);
    }
    rows.push(...((data ?? []) as CaptureRow[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

/** Capture ids that already contributed at least one evidence signal. */
async function fetchSignaledCaptureIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("pending_evidence_signals")
      .select("capture_id")
      .not("capture_id", "is", null)
      .range(from, from + pageSize - 1);
    if (error) {
      console.error(`QUERY FAILED (pending_evidence_signals): ${error.message}`);
      process.exit(1);
    }
    for (const row of data ?? []) ids.add(row.capture_id as string);
    if (!data || data.length < pageSize) break;
  }
  return ids;
}

async function reprocessDriveFiles(): Promise<void> {
  console.log("--- A) Drive files → evidence lane ---");
  const files = await fetchCaptures("googledrive", "file");
  const signaled = reprocessAll ? new Set<string>() : await fetchSignaledCaptureIds();
  const pending = files.filter((f) => !signaled.has(f.id));

  console.log(
    `${files.length} Drive file captures — ${files.length - pending.length} already contributed signals` +
      `${reprocessAll ? " (--reprocess-all: forcing)" : ", skipped"}, ${pending.length} to process.`,
  );
  if (!apply || pending.length === 0) {
    if (!apply) console.log("  (dry run — no writes)\n");
    return;
  }

  const { processCaptureForEvidence } = await import(
    "@/app/_features/memory/evidence/process-capture"
  );
  const { persistCaptureIntelligenceOutcome } = await import(
    "@/app/_features/capture/services/intelligence/capture-intelligence-persistence"
  );

  let routed = 0;
  let noSignal = 0;
  let failed = 0;
  for (const [index, row] of pending.entries()) {
    const label = row.title ?? row.id;
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
        `  [${index + 1}/${pending.length}] ${outcome.padEnd(9)} (${result.signalsDetected} signals) ${label}`,
      );
    } catch (error) {
      failed++;
      console.log(
        `  [${index + 1}/${pending.length}] FAILED    ${label}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  console.log(`  Drive done — ${routed} routed, ${noSignal} no_signal, ${failed} failed.\n`);
}

async function reprocessStripePayments(): Promise<void> {
  console.log("--- B) Stripe payments → billing record producer ---");
  const payments = await fetchCaptures("stripe", "payment");
  console.log(`${payments.length} Stripe payment captures.`);
  if (!apply || payments.length === 0) {
    if (!apply) console.log("  (dry run — no writes)\n");
    return;
  }

  const { produceBillingRecordSignals } = await import(
    "@/app/_features/capture/services/producers/billing-record-producer"
  );

  const tallies = new Map<string, number>();
  const tally = (key: string) => tallies.set(key, (tallies.get(key) ?? 0) + 1);

  for (const [index, row] of payments.entries()) {
    const extracted = { ...(row.extracted_data ?? {}) };
    // Mirror the current billing adapter: unpaid invoices carry their total
    // in amount_due; the old adapter left amount=0 on these rows.
    if (
      (typeof extracted.amount !== "number" || extracted.amount <= 0) &&
      typeof extracted.amount_due === "number" &&
      extracted.amount_due > 0
    ) {
      extracted.amount = extracted.amount_due;
    }

    try {
      const result = await produceBillingRecordSignals({
        workspaceId: row.workspace_id,
        envelope: {
          sourceType: "stripe",
          captureType: "payment",
          externalId: row.source_external_id ?? row.id,
          title: row.title,
          occurredAt: row.created_at,
          participants: [],
          threadId: null,
          extracted,
          raw: row.raw_payload ?? {},
          noise: null,
        },
        source: "stripe",
      });
      const key = result.reason ?? (result.matched ? "matched" : "no-match");
      tally(key);
      console.log(
        `  [${index + 1}/${payments.length}] ${key.padEnd(15)} ${extracted.customer_name ?? extracted.customer_email ?? row.source_external_id}`,
      );
    } catch (error) {
      tally("failed");
      console.log(
        `  [${index + 1}/${payments.length}] FAILED          ${row.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  console.log(
    `  Stripe done — ${[...tallies.entries()].map(([k, n]) => `${n} ${k}`).join(", ")}.\n`,
  );
}

async function runHeldDiscovery(): Promise<void> {
  console.log("--- C) Held Outlook mail → cold-intent discovery ---");
  const cutoffIso = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Workspaces with held outlook mail in the lookback window.
  const { data, error } = await supabase
    .from("capture_events")
    .select("workspace_id")
    .eq("source_type", "outlook")
    .eq("gate_action", "held")
    .gte("created_at", cutoffIso)
    .limit(1000);
  if (error) {
    console.error(`QUERY FAILED (held outlook): ${error.message}`);
    return;
  }
  const workspaceIds = [...new Set((data ?? []).map((r) => r.workspace_id as string))];
  console.log(
    `${workspaceIds.length} workspace(s) with held Outlook mail in the last ${lookbackDays}d.`,
  );

  const { fetchHeldRows, groupHeldRows } = await import(
    "@/app/_features/capture/services/relationship-discovery"
  );

  for (const workspaceId of workspaceIds) {
    const heldRows = await fetchHeldRows(workspaceId, cutoffIso);
    const groups = groupHeldRows(heldRows);
    console.log(`  workspace ${workspaceId}: ${heldRows.length} held rows, ${groups.length} senders`);

    if (!apply) continue;

    const { runHeldIntentDiscovery } = await import(
      "@/app/_features/capture/services/held-intent-discovery"
    );

    // Single pass: the discovery read has no memory of previous runs, so
    // looping would re-read (and re-pay for) the same senders.
    const result = await runHeldIntentDiscovery(workspaceId, {
      lookbackDays,
      maxSenders: maxReads,
    });
    console.log(
      `    ${result.reads} reads, ${result.promoted} promoted, ` +
        `${result.releasedCaptures} released, ${result.skippedFreeCriteria} free-criteria skips` +
        (result.errors.length ? `, ${result.errors.length} errors` : ""),
    );
    for (const err of result.errors) console.log(`      error: ${err}`);
  }
  if (!apply) console.log("  (dry run — no reads, no writes)");
  console.log();
}

async function main() {
  console.log(`Target: ${new URL(supabaseUrl).host}`);
  console.log(
    apply ? "MODE: APPLY (writes enabled)\n" : "MODE: DRY RUN (pass --apply to write)\n",
  );

  if (want("drive")) await reprocessDriveFiles();
  if (want("stripe")) await reprocessStripePayments();
  if (want("held")) await runHeldDiscovery();

  console.log(apply ? "Apply complete." : "Dry run complete — pass --apply to write.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Email resource-signal backfill (2026-08-29).
 *
 * Historical gmail/outlook captures were classified before the classifier
 * became attachment-aware (document_file_present corroboration,
 * meeting_notes_detected, invoice_document_detected, attachment-only
 * detection). Their contracts, meeting notes, and invoices never emitted
 * resource-lane evidence — so Resources stayed empty.
 *
 * This pass re-classifies email captures through TODAY's classifier and
 * routes only the signals each capture has never contributed
 * (dedupe on capture_id + signal — re-adding would inflate log-odds
 * scores). Signals route through the same live path (addSignalToEvidence),
 * so evidence crossing the auto bar births records with full autonomy.
 * Meeting-entity signals are skipped: birthing historical calendar events
 * en masse is not the goal here.
 *
 * Dry-run by default; --apply writes.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" \
 *     pnpm tsx scripts/backfill-email-resource-signals.ts [--apply] [--lookback-days=90] [--workspace <id>]
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { classifyEmailCapture } from "@/app/_features/memory/evidence/classifier";
import { extractEmailData } from "@/app/_features/memory/evidence/process-capture";
import { addSignalToEvidence } from "@/app/_features/memory/evidence/add-signal";

const apply = process.argv.includes("--apply");
const lookbackArg = process.argv.find((a) => a.startsWith("--lookback-days="));
const lookbackDays = lookbackArg ? Number(lookbackArg.split("=")[1]) : 90;
const workspaceFlag = process.argv.indexOf("--workspace");
const workspaceId =
  workspaceFlag >= 0 ? (process.argv[workspaceFlag + 1] ?? null) : null;

const CHUNK = 100;

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function main() {
  const supabase = createAdminClient();
  const since = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  let query = supabase
    .from("capture_events")
    .select("id, workspace_id, source_type, capture_type, extracted_data, raw_payload, created_at")
    .in("source_type", ["gmail", "outlook"])
    .in("capture_type", ["message", "thread"])
    // Memory-first policy: held mail stays invisible (no evidence, no LLM
    // spend) until the sender is promoted. Never backfill signals for it.
    .neq("gate_action", "held")
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (workspaceId) query = query.eq("workspace_id", workspaceId);

  const { data: captures, error } = await query;
  if (error) throw error;

  console.log(
    `[backfill] ${captures?.length ?? 0} email captures since ${since.slice(0, 10)}${apply ? "" : " (dry run)"}`,
  );
  if (!captures?.length) return;

  let classified = 0;
  let skippedNoData = 0;
  const addedBySignal = new Map<string, number>();
  const createdRecords: string[] = [];
  let failed = 0;

  for (let i = 0; i < captures.length; i += CHUNK) {
    const chunk = captures.slice(i, i + CHUNK);
    const chunkIds = chunk.map((c) => c.id as string);

    // Signals these captures already contributed — never re-add.
    const { data: existingSignals, error: signalsError } = await supabase
      .from("pending_evidence_signals")
      .select("capture_id, signal")
      .in("capture_id", chunkIds);
    if (signalsError) throw signalsError;
    const seen = new Set(
      (existingSignals ?? []).map((s) => `${s.capture_id}:${s.signal}`),
    );

    for (const capture of chunk) {
      const emailData = extractEmailData(
        toRecord(capture.extracted_data),
        toRecord(capture.raw_payload),
      );
      if (!emailData) {
        skippedNoData += 1;
        continue;
      }

      const signals = await classifyEmailCapture(
        capture.workspace_id as string,
        emailData,
        capture.id as string,
      );
      classified += 1;

      for (const signal of signals) {
        if (signal.entityType === "meeting") continue;
        if (seen.has(`${capture.id}:${signal.signal}`)) continue;
        seen.add(`${capture.id}:${signal.signal}`);

        addedBySignal.set(signal.signal, (addedBySignal.get(signal.signal) ?? 0) + 1);

        if (!apply) continue;
        try {
          const result = await addSignalToEvidence({
            workspaceId: capture.workspace_id as string,
            entityType: signal.entityType,
            identifier: signal.identifier,
            signal: signal.signal,
            captureId: capture.id as string,
            extractedData: signal.extractedData,
          });
          if (result.action === "auto") {
            createdRecords.push(
              `${signal.entityType} "${signal.identifier}" (via ${signal.signal})`,
            );
          }
        } catch (error) {
          failed += 1;
          console.error(
            `[backfill] FAILED ${signal.signal} for capture ${capture.id}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }

    console.log(
      `[backfill] ${Math.min(i + CHUNK, captures.length)}/${captures.length} captures processed`,
    );
  }

  console.log(`[backfill] classified: ${classified}, no email data: ${skippedNoData}`);
  console.log("[backfill] new signals by type:");
  for (const [signal, count] of [...addedBySignal.entries()].sort()) {
    console.log(`  ${signal}: ${count}`);
  }
  if (createdRecords.length > 0) {
    console.log("[backfill] records born:");
    for (const record of createdRecords) console.log(`  ${record}`);
  }
  console.log(
    `[backfill] done — ${apply ? `failed: ${failed}` : "dry run, nothing written"}`,
  );
}

main().catch((error) => {
  console.error("[backfill] fatal:", error);
  process.exit(1);
});

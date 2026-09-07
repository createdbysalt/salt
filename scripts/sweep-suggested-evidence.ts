/**
 * Backlog sweep for memory full autonomy (2026-08-29).
 *
 * Before the threshold-only gate, record birth was parked behind earned
 * calibration (P6), relationship-grade worthiness (P7), and a confirm-only
 * resource carve-out — and nothing re-evaluated parked rows, so evidence
 * that crossed the auto bar sat in pending_evidence status='suggested'
 * forever (the retired "Ready to Add" lane).
 *
 * This sweep drains the backlog:
 * - Rows over their entity's auto bar → autoCreateRecord (the same path
 *   live signals use; operator refusal and required-field failures are
 *   logged and skipped).
 * - Work-lane rows whose identifier is a generic ceremony title
 *   ("stand-up meeting") → dismissed (classifier garbage that predates the
 *   generic-title guard).
 * - Everything else keeps accumulating.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/sweep-suggested-evidence.ts [--workspace <id>] [--dry-run]
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { fromLearningDbEntityType } from "@/app/_lib/learning";
import {
  evaluateEvidence,
  logOddsToProbability,
  type IntakeEntityType,
} from "@/app/_features/memory/care/intake";
import { autoCreateRecord } from "@/app/_features/memory/evidence/auto-create-record";
import { isGenericCeremonyTitle } from "@/app/_features/memory/evidence/classifier";
import type { ExtractedFieldValue } from "@/app/_features/memory/evidence/types";

interface SignalRow {
  capture_id: string | null;
  created_at: string;
  signal?: string;
  weight?: number;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const workspaceFlag = args.indexOf("--workspace");
const workspaceId =
  workspaceFlag >= 0 ? (args[workspaceFlag + 1] ?? null) : null;

async function main() {
  const supabase = createAdminClient();

  let query = supabase
    .from("pending_evidence")
    .select("*, signals:pending_evidence_signals(capture_id, created_at, signal, weight)")
    .in("status", ["suggested", "watching"])
    .order("last_signal_at", { ascending: true });
  if (workspaceId) query = query.eq("workspace_id", workspaceId);

  const { data: rows, error } = await query;
  if (error) throw error;

  console.log(
    `[sweep] ${rows?.length ?? 0} non-terminal evidence rows${workspaceId ? ` (workspace ${workspaceId})` : ""}${dryRun ? " — DRY RUN" : ""}`,
  );

  let created = 0;
  let dismissed = 0;
  let parked = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const entityType = fromLearningDbEntityType(
      row.entity_type,
    ) as IntakeEntityType | null;
    if (!entityType) {
      console.log(
        `[sweep] skip ${row.id}: unmappable entity_type ${row.entity_type}`,
      );
      parked++;
      continue;
    }

    const signals = (row.signals ?? []) as SignalRow[];

    // Repair scores pinned by the retired Math.max bug: the honest score is
    // the sum of the provenance signals' weights. Never regress a row —
    // unknown-signal proposals banked confidence-derived deltas that the
    // weight sum can't see.
    const weightSum = signals.reduce(
      (sum, signal) => sum + (typeof signal.weight === "number" ? signal.weight : 0),
      0,
    );
    let score = row.log_odds_score as number;
    if (weightSum > score) {
      console.log(
        `[sweep] repair ${entityType} "${row.identifier}" score ${score} → ${weightSum} (${signals.length} signals, un-pinned)`,
      );
      score = weightSum;
      if (!dryRun) {
        await supabase
          .from("pending_evidence")
          .update({ log_odds_score: score })
          .eq("id", row.id);
      }
    }

    const label = `${entityType} "${row.identifier}" (score ${score})`;

    // Garbage control: generic ceremony titles are never client work.
    if (entityType === "work" && isGenericCeremonyTitle(row.identifier)) {
      console.log(`[sweep] dismiss ${label} — generic ceremony title`);
      if (!dryRun) {
        await supabase
          .from("pending_evidence")
          .update({
            status: "dismissed",
            dismissed_at: new Date().toISOString(),
            dismissed_reason:
              "Generic ceremony title — not client work (autonomy sweep)",
          })
          .eq("id", row.id);
      }
      dismissed++;
      continue;
    }

    if (evaluateEvidence(entityType, score) !== "auto") {
      console.log(
        `[sweep] park ${label} — under the auto bar, keeps accumulating`,
      );
      parked++;
      continue;
    }

    const latestCaptureId = [...signals]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .find((signal) => signal.capture_id)?.capture_id;

    console.log(`[sweep] create ${label}`);
    if (!dryRun) {
      const result = await autoCreateRecord({
        workspaceId: row.workspace_id,
        evidenceId: row.id,
        entityType,
        identifier: row.identifier,
        confidence: logOddsToProbability(score),
        extractedFields: (row.extracted_fields ?? {}) as unknown as Record<
          string,
          ExtractedFieldValue
        >,
        signalCount: Math.max(signals.length, 1),
        captureId: latestCaptureId ?? undefined,
      });
      if (!result.ok) {
        console.log(`[sweep]   failed: ${result.error}`);
        failed++;
        continue;
      }
    }
    created++;
  }

  console.log(
    `[sweep] done — created: ${created}, dismissed: ${dismissed}, parked: ${parked}, failed: ${failed}`,
  );
}

main().catch((error) => {
  console.error("[sweep] fatal:", error);
  process.exit(1);
});

/**
 * Memory Hygiene - Execution Script
 *
 * Unified data quality playbook that scans for:
 * - Duplicate records (merge candidates)
 * - Stale records (archive candidates)
 * - Incomplete records (fill suggestions)
 * - Orphan records (link suggestions)
 *
 * Emits evidence to the Watching queue for user review.
 */

import {
  memoryGetSimilarRecords,
  memoryGetStaleRecords,
  memoryGetIncompleteRecords,
  memoryGetOrphanRecords,
  memoryAccumulateEvidence,
} from "@/app/_lib/memory-tools";

interface RunContext {
  workspaceId: string;
  triggerSignal?: string;
  triggerData?: Record<string, unknown>;
}

interface RunResult {
  success: boolean;
  error?: string;
  summary?: string;
  data?: Record<string, unknown>;
}

export async function run(ctx: RunContext): Promise<RunResult> {
  const { workspaceId } = ctx;

  if (!workspaceId) {
    return { success: false, error: "No workspace context" };
  }

  // Scan for all hygiene issues in parallel
  const [duplicatesResult, staleResult, incompleteResult, orphanResult] =
    await Promise.all([
      memoryGetSimilarRecords({ workspaceId, limit: 50 }),
      memoryGetStaleRecords({ workspaceId, days: 90, limit: 50 }),
      memoryGetIncompleteRecords({ workspaceId, limit: 50 }),
      memoryGetOrphanRecords({ workspaceId, limit: 50 }),
    ]);

  const emitted: string[] = [];

  // --- DUPLICATES ---
  // Emit evidence for duplicate matches (merge candidates)
  for (const match of duplicatesResult.matches) {
    if (match.confidence < 80) continue;

    const evidenceResult = await memoryAccumulateEvidence({
      workspaceId,
      entityType: match.entityType,
      entityId: match.recordA.id,
      field: "_merge_candidate",
      value: {
        targetId: match.recordB.id,
        targetName: match.recordB.name,
        signal: match.signal,
      },
      confidence: match.confidence,
      evidenceType: "cross_reference",
      because: match.because,
      source: "playbook",
      sourceDetails: {
        playbookSlug: "memory-hygiene",
      },
    });

    if (evidenceResult.evidenceId) {
      emitted.push(evidenceResult.evidenceId);
    }
  }

  // --- STALE RECORDS ---
  // Emit evidence for stale records (archive candidates)
  for (const record of staleResult.records) {
    if (record.severity < 60) continue;

    const evidenceResult = await memoryAccumulateEvidence({
      workspaceId,
      entityType: record.entityType,
      entityId: record.id,
      field: "_archive_candidate",
      value: {
        reason: "stale",
        daysSinceActivity: record.daysSinceActivity,
        lastActivityAt: record.lastActivityAt,
      },
      confidence: record.severity,
      evidenceType: "recency",
      because: `No activity in ${record.daysSinceActivity} days`,
      source: "playbook",
      sourceDetails: {
        playbookSlug: "memory-hygiene",
      },
    });

    if (evidenceResult.evidenceId) {
      emitted.push(evidenceResult.evidenceId);
    }
  }

  // --- INCOMPLETE RECORDS ---
  // Emit evidence for incomplete records (fill suggestions)
  for (const record of incompleteResult.records) {
    if (record.severity < 70) continue;

    for (const field of record.missingFields) {
      const evidenceResult = await memoryAccumulateEvidence({
        workspaceId,
        entityType: record.entityType,
        entityId: record.id,
        field: field,
        value: null,
        confidence: record.severity,
        evidenceType: "behavioral_signal",
        because: `Missing required field: ${field}`,
        source: "playbook",
        sourceDetails: {
          playbookSlug: "memory-hygiene",
        },
      });

      if (evidenceResult.evidenceId) {
        emitted.push(evidenceResult.evidenceId);
      }
    }
  }

  // --- ORPHAN RECORDS ---
  // Emit evidence for orphan records (link suggestions)
  for (const record of orphanResult.records) {
    if (record.severity < 60) continue;

    const evidenceResult = await memoryAccumulateEvidence({
      workspaceId,
      entityType: record.entityType,
      entityId: record.id,
      field: "_link_candidate",
      value: {
        reason: "orphan",
        suggestedAction: record.suggestedAction,
      },
      confidence: record.severity,
      evidenceType: "cross_reference",
      because: `Record has no organization connection`,
      source: "playbook",
      sourceDetails: {
        playbookSlug: "memory-hygiene",
      },
    });

    if (evidenceResult.evidenceId) {
      emitted.push(evidenceResult.evidenceId);
    }
  }

  const totalIssues =
    duplicatesResult.matches.length +
    staleResult.records.length +
    incompleteResult.records.length +
    orphanResult.records.length;

  return {
    success: true,
    summary: `Found ${totalIssues} hygiene issues, emitted ${emitted.length} to Watching`,
    data: {
      duplicates: duplicatesResult.matches.length,
      stale: staleResult.records.length,
      incomplete: incompleteResult.records.length,
      orphan: orphanResult.records.length,
      emitted: emitted.length,
    },
  };
}

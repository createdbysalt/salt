/**
 * Memory Care — Hygiene capability
 *
 * Unified data quality scan:
 * - Duplicate records (merge candidates)
 * - Stale records (archive candidates)
 * - Incomplete records (fill suggestions)
 * - Orphan records (link candidates — ONLY with concrete resolved targets)
 *
 * Emits evidence to Watching (Memory → Filter) for user review.
 * Ported from the retired memory-hygiene system playbook.
 *
 * P5 contract: Watching shows only evidence stacking toward a concrete
 * candidate. No-candidate diagnostics stay internal — never surface to user.
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  memoryAccumulateEvidence,
  memoryGetIncompleteRecords,
  memoryGetOrphanRecords,
  memoryGetSimilarRecords,
  memoryGetStaleRecords,
} from "@/app/_lib/memory-tools";
import {
  extractDomain,
  isPersonalDomain,
} from "@/app/_features/capture/services/system-plays/person-signals";
import { CARE_SETTINGS_SLUGS, type CareRunContext, type CareRunResult } from "../types";

interface OrphanRecord {
  id: string;
  entityType: string;
  name: string;
  signal: string;
  severity: number;
  suggestedAction: string;
}

/**
 * P5 implementation: search for a concrete org candidate before emitting
 * _link_candidate evidence. If no candidate can be resolved, skip silently
 * — the user should never see "I couldn't connect X to an organization."
 */
async function emitLinkCandidatesWithTargets(
  workspaceId: string,
  orphans: OrphanRecord[],
  source: string
): Promise<string[]> {
  const admin = createAdminClient();
  const emitted: string[] = [];

  // Group orphans by entity type for batch processing
  const personOrphans = orphans.filter((r) => r.entityType === "person");
  const workOrphans = orphans.filter((r) => r.entityType === "work");
  const billingOrphans = orphans.filter((r) => r.entityType === "billing");

  // --- PERSON ORPHANS: search by email domain ---
  if (personOrphans.length > 0) {
    const personIds = personOrphans.map((p) => p.id);
    const { data: people } = await admin
      .from("people")
      .select("id, email")
      .in("id", personIds);

    for (const person of people ?? []) {
      if (!person.email) continue;

      const domain = extractDomain(person.email);
      if (!domain || isPersonalDomain(person.email)) continue;

      // Search for org by domain
      const { data: org } = await admin
        .from("organizations")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .eq("domain", domain)
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();

      if (!org) continue;

      // Found a concrete candidate — emit with target
      const orphanRecord = personOrphans.find((o) => o.id === person.id);
      const evidenceResult = await memoryAccumulateEvidence({
        workspaceId,
        entityType: "person",
        entityId: person.id,
        field: "_link_candidate",
        value: {
          targetId: org.id,
          targetName: org.name ?? "Organization",
          reason: "domain_match",
          signal: "email_domain_match",
        },
        confidence: orphanRecord?.severity ?? 75,
        evidenceType: "cross_reference",
        because: `Email domain ${domain} matches ${org.name ?? "an organization"}`,
        source: "care",
        sourceDetails: { playbookSlug: source },
      });

      if (evidenceResult.evidenceId) emitted.push(evidenceResult.evidenceId);
    }
  }

  // --- WORK ORPHANS: search by associated payment/person if available ---
  // For now, work orphans without org links stay internal. Phase 2 can add
  // heuristics (payment match, file content, etc.) to find candidates.
  // P5: no candidate = no evidence.

  // --- BILLING ORPHANS: search by payment metadata ---
  // For now, billing orphans without org links stay internal.
  // P5: no candidate = no evidence.

  return emitted;
}

export async function runHygieneCapability(
  ctx: CareRunContext
): Promise<CareRunResult> {
  const { workspaceId } = ctx;

  if (!workspaceId) {
    return { success: false, error: "No workspace context" };
  }

  const [duplicatesResult, staleResult, incompleteResult, orphanResult] =
    await Promise.all([
      memoryGetSimilarRecords({ workspaceId, limit: 50 }),
      memoryGetStaleRecords({ workspaceId, days: 90, limit: 50 }),
      memoryGetIncompleteRecords({ workspaceId, limit: 50 }),
      memoryGetOrphanRecords({ workspaceId, limit: 50 }),
    ]);

  const emitted: string[] = [];
  const source = CARE_SETTINGS_SLUGS.hygiene;

  // --- DUPLICATES ---
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
      source: "care",
      sourceDetails: { playbookSlug: source },
    });

    if (evidenceResult.evidenceId) emitted.push(evidenceResult.evidenceId);
  }

  // --- STALE RECORDS ---
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
      source: "care",
      sourceDetails: { playbookSlug: source },
    });

    if (evidenceResult.evidenceId) emitted.push(evidenceResult.evidenceId);
  }

  // --- INCOMPLETE RECORDS ---
  for (const record of incompleteResult.records) {
    if (record.severity < 70) continue;

    for (const field of record.missingFields) {
      const evidenceResult = await memoryAccumulateEvidence({
        workspaceId,
        entityType: record.entityType,
        entityId: record.id,
        field: "_missing_field",
        value: { field, reason: "missing_required_field" },
        confidence: record.severity,
        evidenceType: "behavioral_signal",
        because: `Missing required field: ${field}`,
        source: "care",
        sourceDetails: { playbookSlug: source },
      });

      if (evidenceResult.evidenceId) emitted.push(evidenceResult.evidenceId);
    }
  }

  // --- ORPHAN RECORDS ---
  // P5: emit _link_candidate ONLY when we have a concrete resolved target.
  // No-candidate orphans stay internal — never surface to Watching.
  const linkCandidatesEmitted = await emitLinkCandidatesWithTargets(
    workspaceId,
    orphanResult.records.filter((r) => r.severity >= 60),
    source
  );
  emitted.push(...linkCandidatesEmitted);

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
      orphanFound: orphanResult.records.length,
      orphanWithCandidate: linkCandidatesEmitted.length,
      emitted: emitted.length,
    },
  };
}

/**
 * Memory Care — Hygiene capability
 *
 * Unified data quality scan:
 * - Duplicate records (merge candidates)
 * - Stale records (archive candidates)
 * - Incomplete records (counted internally — never emitted without a value)
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
} from "@/app/_features/memory/records/person-signals";
import {
  findBlockingCorrection,
  getCorrectionBlocklist,
} from "@/app/_lib/learning/correction-blocklist";
import type { LearningEntityType } from "@/app/_lib/memory-tools";
import { CARE_SETTINGS_SLUGS, type CareRunContext, type CareRunResult } from "../types";

/**
 * Corrections feed forward: a candidate the user dismissed ("Keep both",
 * "Keep", "Not this") must not re-surface on the next scan. Returns true
 * when the (field, value) pair is blocked for this entity.
 */
async function isBlockedByCorrection(
  workspaceId: string,
  entityType: string,
  entityId: string,
  field: string,
  value: unknown
): Promise<boolean> {
  const blocklist = await getCorrectionBlocklist(
    workspaceId,
    entityType,
    entityId,
    field
  );
  return findBlockingCorrection(blocklist, field, value) !== null;
}

interface OrphanRecord {
  id: string;
  entityType: string;
  name: string;
  signal: string;
  severity: number;
  suggestedAction: string;
}

/**
 * What accepting a link candidate should write. Carried in the evidence
 * value so Watching's "Link it" can perform the operation generically.
 * - "organization_people": person ↔ org junction insert
 * - "organization_id" / "person_id": direct column on the entity's table
 */
type LinkField = "organization_people" | "organization_id" | "person_id";

interface LinkTarget {
  targetId: string;
  targetName: string;
  targetType: "organization" | "person";
  linkField: LinkField;
  reason: string;
}

async function findActiveOrg(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  orgId: string
): Promise<{ id: string; name: string | null } | null> {
  const { data } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle();
  return data ?? null;
}

async function emitLinkCandidate(
  workspaceId: string,
  orphan: OrphanRecord,
  target: LinkTarget,
  source: string
): Promise<string | null> {
  // Corrections feed forward: a dismissed link to this target never re-surfaces.
  if (
    await isBlockedByCorrection(
      workspaceId,
      orphan.entityType,
      orphan.id,
      "_link_candidate",
      { targetId: target.targetId }
    )
  ) {
    return null;
  }

  const evidenceResult = await memoryAccumulateEvidence({
    workspaceId,
    entityType: orphan.entityType as LearningEntityType,
    entityId: orphan.id,
    field: "_link_candidate",
    value: {
      targetId: target.targetId,
      targetName: target.targetName,
      targetType: target.targetType,
      linkField: target.linkField,
      reason: target.reason,
      signal: orphan.signal,
    },
    confidence: orphan.severity,
    evidenceType: "cross_reference",
    because: target.reason,
    source: "care",
    sourceDetails: { playbookSlug: source },
  });

  return evidenceResult.evidenceId ?? null;
}

/**
 * Work orphans (no org, no person): resolve a concrete org through the
 * record's own paper trail — its billing contact's organization, a billing
 * record tied to the work, or a linked resource already filed under an org.
 */
async function resolveWorkLinkTarget(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  workId: string
): Promise<LinkTarget | null> {
  const { data: work } = await admin
    .from("work")
    .select("id, billing_contact_id")
    .eq("id", workId)
    .maybeSingle();
  if (!work) return null;

  // 1. The billing contact's organization.
  if (work.billing_contact_id) {
    const { data: membership } = await admin
      .from("organization_people")
      .select("organization_id")
      .eq("person_id", work.billing_contact_id)
      .limit(1)
      .maybeSingle();
    if (membership?.organization_id) {
      const org = await findActiveOrg(admin, workspaceId, membership.organization_id);
      if (org) {
        return {
          targetId: org.id,
          targetName: org.name ?? "Organization",
          targetType: "organization",
          linkField: "organization_id",
          reason: `Its billing contact belongs to ${org.name ?? "an organization"}`,
        };
      }
    }
  }

  // 2. A billing record tied to this work already names the org.
  const { data: billing } = await admin
    .from("billing_records")
    .select("organization_id")
    .eq("workspace_id", workspaceId)
    .eq("work_id", workId)
    .not("organization_id", "is", null)
    .is("deleted_at", null)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (billing?.organization_id) {
    const org = await findActiveOrg(admin, workspaceId, billing.organization_id);
    if (org) {
      return {
        targetId: org.id,
        targetName: org.name ?? "Organization",
        targetType: "organization",
        linkField: "organization_id",
        reason: `A billing record tied to it belongs to ${org.name ?? "an organization"}`,
      };
    }
  }

  // 3. A linked resource (e.g. the contract) is already filed under an org.
  const { data: links } = await admin
    .from("entity_links")
    .select("source_id")
    .eq("workspace_id", workspaceId)
    .in("source_type", ["resource", "file"])
    .eq("target_type", "work")
    .eq("target_id", workId);
  const resourceIds = (links ?? []).map((link) => link.source_id);
  if (resourceIds.length > 0) {
    const { data: resource } = await admin
      .from("resources")
      .select("organization_id")
      .eq("workspace_id", workspaceId)
      .in("id", resourceIds)
      .not("organization_id", "is", null)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();
    if (resource?.organization_id) {
      const org = await findActiveOrg(admin, workspaceId, resource.organization_id);
      if (org) {
        return {
          targetId: org.id,
          targetName: org.name ?? "Organization",
          targetType: "organization",
          linkField: "organization_id",
          reason: `A document linked to it is filed under ${org.name ?? "an organization"}`,
        };
      }
    }
  }

  return null;
}

/**
 * Billing orphans (no org, person, or work): resolve through the party name
 * the record carries in metadata (pending_org_name / pending_person_name,
 * set when the record was drafted before the party existed in Memory).
 * Ambiguous name matches (more than one hit) stay internal.
 */
async function resolveBillingLinkTarget(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  billingId: string
): Promise<LinkTarget | null> {
  const { data: record } = await admin
    .from("billing_records")
    .select("id, metadata")
    .eq("id", billingId)
    .maybeSingle();
  if (!record) return null;

  const metadata =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : {};
  const pendingOrgName =
    typeof metadata.pending_org_name === "string" && metadata.pending_org_name.trim()
      ? metadata.pending_org_name.trim()
      : null;
  const pendingPersonName =
    typeof metadata.pending_person_name === "string" && metadata.pending_person_name.trim()
      ? metadata.pending_person_name.trim()
      : null;

  if (pendingOrgName) {
    const { data: orgs } = await admin
      .from("organizations")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .ilike("name", pendingOrgName)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(2);
    if (orgs?.length === 1) {
      return {
        targetId: orgs[0].id,
        targetName: orgs[0].name ?? pendingOrgName,
        targetType: "organization",
        linkField: "organization_id",
        reason: `The record names ${orgs[0].name ?? pendingOrgName}`,
      };
    }
  }

  if (pendingPersonName) {
    const { data: people } = await admin
      .from("people")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .ilike("name", pendingPersonName)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(2);
    if (people?.length === 1) {
      return {
        targetId: people[0].id,
        targetName: people[0].name ?? pendingPersonName,
        targetType: "person",
        linkField: "person_id",
        reason: `The record names ${people[0].name ?? pendingPersonName}`,
      };
    }
  }

  return null;
}

/**
 * P5 implementation: search for a concrete target before emitting
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

      const orphanRecord = personOrphans.find((o) => o.id === person.id);
      if (!orphanRecord) continue;

      const evidenceId = await emitLinkCandidate(workspaceId, orphanRecord, {
        targetId: org.id,
        targetName: org.name ?? "Organization",
        targetType: "organization",
        linkField: "organization_people",
        reason: `Email domain ${domain} matches ${org.name ?? "an organization"}`,
      }, source);
      if (evidenceId) emitted.push(evidenceId);
    }
  }

  // --- WORK ORPHANS: resolve through the record's own paper trail ---
  for (const orphan of workOrphans) {
    const target = await resolveWorkLinkTarget(admin, workspaceId, orphan.id);
    if (!target) continue;
    const evidenceId = await emitLinkCandidate(workspaceId, orphan, target, source);
    if (evidenceId) emitted.push(evidenceId);
  }

  // --- BILLING ORPHANS: resolve through the party name on the record ---
  for (const orphan of billingOrphans) {
    const target = await resolveBillingLinkTarget(admin, workspaceId, orphan.id);
    if (!target) continue;
    const evidenceId = await emitLinkCandidate(workspaceId, orphan, target, source);
    if (evidenceId) emitted.push(evidenceId);
  }

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
    // Name-similarity signals are deliberately emitted below the usual 80
    // floor (subset names sit at 70) so they surface as user-approved
    // proposals instead of vanishing — they can never auto-apply.
    const floor = match.signal === "person_duplicate_name_subset" ? 70 : 80;
    if (match.confidence < floor) continue;

    const mergeValue = {
      targetId: match.recordB.id,
      targetName: match.recordB.name,
      signal: match.signal,
    };
    if (
      await isBlockedByCorrection(
        workspaceId,
        match.entityType,
        match.recordA.id,
        "_merge_candidate",
        mergeValue
      )
    ) {
      continue;
    }

    const evidenceResult = await memoryAccumulateEvidence({
      workspaceId,
      entityType: match.entityType,
      entityId: match.recordA.id,
      field: "_merge_candidate",
      value: mergeValue,
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

    // Any archive dismissal blocks — "keep this record active" isn't
    // value-specific (the day counts change every scan).
    if (
      await isBlockedByCorrection(
        workspaceId,
        record.entityType,
        record.id,
        "_archive_candidate",
        null
      )
    ) {
      continue;
    }

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
  // P5/Watching contract: a gap without a proposed value is a diagnostic, not
  // a proposal — it never surfaces to Watching. Incomplete records are counted
  // internally only; enrichment that finds a concrete value emits through the
  // records capability instead.

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

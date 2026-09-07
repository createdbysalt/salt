/**
 * Memory Care — Promotion sweep
 *
 * The apply decision normally happens once, inside `memoryUpdateField` /
 * `processCareProposal`, at the moment a proposal is written. Anything that
 * parks evidence without clearing the bar at that instant — a legitimately
 * low-confidence proposal later corroborated by a path that only
 * accumulates, or a transient apply failure (e.g. an unmapped field) — used
 * to sit in Watching until the evidence expired, even when the aggregated
 * confidence had long since cleared the bar.
 *
 * This sweep is the re-evaluation pass: for every unresolved evidence group
 * it recomputes the aggregated confidence against the tier bar and, when the
 * bar is cleared, applies through `memoryUpdateField` (the protected write
 * path — correction blocklist, provenance, and Handled logging all run as
 * usual). Contradicted groups (competing values) are skipped: the conflict
 * surfaces in Watching for the user to break.
 *
 * Entry points: Sync & Scan (`capture/actions/run-intelligence-scan.ts`) and
 * the care cron (`runDueCareCapabilities` in `./scheduler.ts`).
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  expireOldEvidence,
  fromLearningDbEntityType,
  getAggregatedConfidence,
  resolveEvidence,
  toLearningDbEntityType,
  type LearningEntityType,
} from "@/app/_lib/learning";
import { memoryUpdateField } from "@/app/_lib/memory-tools";
import {
  getFieldsForEntity,
  type ContractEntityType,
  type FieldDescriptor,
} from "@/app/_features/memory/taxonomy/field-registry";
import { getCareFieldBar } from "./decision-pipeline";

export interface PromotionSweepResult {
  /** Distinct entity+field groups re-evaluated. */
  groupsEvaluated: number;
  /** Groups whose aggregated confidence cleared the bar and applied. */
  promoted: number;
  /** Groups skipped because unresolved evidence carries competing values. */
  conflicts: number;
  /** Groups resolved out of Watching because the proposed value is invalid
   * for the field (e.g. a timezone string parked on a country field by the
   * pre-transform fill rule). */
  invalidated: number;
  /** Groups resolved because the underlying entity is gone (deleted or
   * archived) — Watching hides these, so parked rows were invisible litter
   * the sweep would otherwise re-evaluate forever. */
  orphaned: number;
  /** Groups whose apply threw (logged, never breaks the sweep). */
  failures: number;
}

/** Slug recorded on promoted writes so Handled rows attribute the sweep. */
export const PROMOTION_PLAYBOOK_SLUG = "memory-promotion";

function toContractEntityType(
  entityType: LearningEntityType
): ContractEntityType | null {
  switch (entityType) {
    case "person":
      return "person";
    case "organization":
      return "org";
    case "work":
      return "work";
    case "billing":
      return "billing";
    case "meeting":
      return "meeting";
    case "resource":
      return "resource";
    case "me":
      return "me";
    default:
      return null;
  }
}

function findFieldDescriptor(
  entityType: LearningEntityType,
  fieldPath: string
): FieldDescriptor | undefined {
  const contractType = toContractEntityType(entityType);
  if (!contractType) return undefined;
  return getFieldsForEntity(contractType).find(
    (field) => field.dbColumn === fieldPath || field.key === fieldPath
  );
}

/**
 * Value-level validity guard. The sweep re-evaluates evidence parked by any
 * historical code path — including paths that proposed values the current
 * registry would never emit (e.g. an IANA timezone string on a country
 * field). Returns a reason string when the value must not be promoted.
 */
function invalidValueReason(
  descriptor: FieldDescriptor | undefined,
  value: unknown
): string | null {
  if (!descriptor) return null;
  if (
    descriptor.fieldType === "country" &&
    !(typeof value === "string" && /^[A-Za-z]{2}$/.test(value))
  ) {
    return `not an ISO 3166-1 alpha-2 code: ${JSON.stringify(value)}`;
  }
  return null;
}

/** Entity tables backing each evidence entity type ("me" has no table). */
const ENTITY_TABLES: Partial<
  Record<
    LearningEntityType,
    "people" | "organizations" | "work" | "meetings" | "resources" | "billing_records"
  >
> = {
  person: "people",
  organization: "organizations",
  work: "work",
  meeting: "meetings",
  resource: "resources",
  billing: "billing_records",
};

/**
 * An entity is promotable only while it exists and is neither deleted nor
 * archived. Watching hides parked evidence for inactive entities, so without
 * this check the sweep would re-evaluate invisible litter on every run.
 */
async function isEntityActive(
  admin: ReturnType<typeof createAdminClient>,
  entityType: LearningEntityType,
  entityId: string
): Promise<boolean> {
  const table = ENTITY_TABLES[entityType];
  if (!table) return true; // "me" and unknown types: no table to check
  const { data, error } = await admin
    .from(table)
    .select("id, archived_at, deleted_at")
    .eq("id", entityId)
    .maybeSingle();
  if (error) return true; // Transient read failure: skip the check, don't resolve
  if (!data) return false;
  return !data.archived_at && !data.deleted_at;
}

export async function promoteParkedEvidence(
  workspaceId: string
): Promise<PromotionSweepResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // TTL enforcement: expireOldEvidence has no other caller, so without this
  // expired rows stayed unresolved (and visible in Watching) forever.
  await expireOldEvidence(workspaceId);

  const { data: rows, error } = await admin
    .from("entity_evidence")
    .select("entity_type, entity_id, field_path")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .limit(1000);

  if (error) throw error;

  // Distinct entity+field groups. Underscore-prefixed meta fields (merge /
  // link / archive candidates) are user-decision proposals rendered in
  // Watching — the sweep never auto-acts on them.
  const groups = new Map<
    string,
    { entityType: LearningEntityType; entityId: string; fieldPath: string }
  >();
  for (const row of rows ?? []) {
    if (row.field_path.startsWith("_")) continue;
    const entityType = fromLearningDbEntityType(row.entity_type);
    if (!entityType) continue;
    const key = `${row.entity_type}:${row.entity_id}:${row.field_path}`;
    if (!groups.has(key)) {
      groups.set(key, { entityType, entityId: row.entity_id, fieldPath: row.field_path });
    }
  }

  const result: PromotionSweepResult = {
    groupsEvaluated: 0,
    promoted: 0,
    conflicts: 0,
    invalidated: 0,
    orphaned: 0,
    failures: 0,
  };

  for (const group of groups.values()) {
    result.groupsEvaluated++;
    try {
      // Orphan check: resolve evidence whose entity is gone. Watching hides
      // these groups, so they'd otherwise be re-evaluated forever.
      if (!(await isEntityActive(admin, group.entityType, group.entityId))) {
        const { data: orphanRows } = await admin
          .from("entity_evidence")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("entity_type", toLearningDbEntityType(group.entityType))
          .eq("entity_id", group.entityId)
          .eq("field_path", group.fieldPath)
          .is("resolved_at", null);
        const orphanIds = (orphanRows ?? []).map((row) => row.id);
        if (orphanIds.length > 0) {
          await resolveEvidence(workspaceId, orphanIds, "expired", {
            reason: "entity_inactive",
            sweep: PROMOTION_PLAYBOOK_SLUG,
          });
        }
        result.orphaned++;
        continue;
      }

      const aggregated = await getAggregatedConfidence(
        workspaceId,
        group.entityType,
        group.entityId,
        group.fieldPath
      );
      if (!aggregated) continue;
      if (aggregated.hasConflict || aggregated.proposedValue === null) {
        result.conflicts++;
        continue;
      }

      // Validity guard: never promote a value the current registry would
      // reject. Invalid parked groups are resolved out of Watching so they
      // stop surfacing (and stop blocking future proposals for the field).
      const descriptor = findFieldDescriptor(group.entityType, group.fieldPath);
      const invalidReason = invalidValueReason(
        descriptor,
        aggregated.proposedValue
      );
      if (invalidReason) {
        await resolveEvidence(workspaceId, aggregated.evidenceIds, "expired", {
          reason: "invalid_value",
          detail: invalidReason,
          sweep: PROMOTION_PLAYBOOK_SLUG,
        });
        result.invalidated++;
        continue;
      }

      // One user-controlled bar for every gated field — tiers never raise
      // it, so no current-value lookup is needed to compute it.
      const { bar } = await getCareFieldBar(
        workspaceId,
        group.entityType,
        group.fieldPath,
        aggregated.proposedValue
      );
      if (bar === Number.POSITIVE_INFINITY) continue;
      if (aggregated.aggregatedConfidence < bar) continue;

      // The tool re-accumulates one corroborating row, re-aggregates, applies,
      // and resolves the whole group — provenance, correction blocklist, and
      // the Handled audit row all run through the protected path.
      const applied = await memoryUpdateField({
        workspaceId,
        entityType: group.entityType,
        entityId: group.entityId,
        field: group.fieldPath,
        value: aggregated.proposedValue,
        confidence: aggregated.aggregatedConfidence,
        because: "Parked evidence cleared the bar on re-evaluation",
        source: "care",
        sourceDetails: { playbookSlug: PROMOTION_PLAYBOOK_SLUG },
        minThreshold: bar > 0 ? bar : undefined,
      });
      if (applied.action === "applied") {
        if (applied.noop) {
          // The tool's no-op guard skipped the apply path (and its evidence
          // resolution) because the field already holds the value. Resolve
          // the parked group here — the desired state holds, nothing left
          // to watch.
          await resolveEvidence(workspaceId, aggregated.evidenceIds, "applied", {
            reason: "already_set",
            sweep: PROMOTION_PLAYBOOK_SLUG,
          });
        }
        result.promoted++;
      }
    } catch (error) {
      // A single bad group (e.g. an unmappable field) must never break the
      // sweep — the next run retries it.
      result.failures++;
      console.error(
        `[memory-care:promotion] Failed to promote ${group.entityType} ${group.entityId} ${group.fieldPath}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return result;
}

/**
 * Record candidates for Memory → Filter → Watching.
 *
 * New-record proposals whose evidence crossed the suggest bar but not the
 * auto-create bar (pending_evidence status = 'suggested'). Slim view model
 * for the "New records" lane — one tap creates the record (accept =
 * immediate apply), dismiss stops watching that identifier.
 *
 * Post plays-canon Phase 2 this lane is where suggest-tier record proposals
 * live; they no longer create plays-queue rows.
 */

import { getSuggestedRecords } from "../evidence/queries";
import type { IntakeEntityType } from "@/app/_features/memory/care/intake";

export interface RecordCandidate {
  evidenceId: string;
  entityType: IntakeEntityType;
  /** Extracted display name, falling back to the canonical identifier. */
  displayName: string;
  /** Canonical identifier (email, domain, …) — shown as provenance. */
  identifier: string;
  confidencePercent: number;
  signalCount: number;
  /**
   * Whether one-tap creation is possible. Meetings and files are creatable
   * when the evidence carries the fields their insert requires (title +
   * start_time for meetings; a name for files — the confirming user becomes
   * uploaded_by). Billing stays dismiss-only until created from its own
   * surface (amounts need review).
   */
  canCreate: boolean;
}

const CREATABLE_TYPES: ReadonlySet<IntakeEntityType> = new Set([
  "person",
  "organization",
  "work",
  "meeting",
  "file",
]);

/** The record's required fields must be present for one-tap creation. */
function hasRequiredFields(
  entityType: IntakeEntityType,
  fields: Record<string, { value: string } | undefined> | null
): boolean {
  switch (entityType) {
    case "meeting":
      return Boolean(fields?.title?.value && fields?.start_time?.value);
    case "file":
      return Boolean(fields?.title?.value ?? fields?.name?.value);
    default:
      return true;
  }
}

export async function getRecordCandidates(
  workspaceId: string,
  limit = 20
): Promise<RecordCandidate[]> {
  const rows = await getSuggestedRecords(workspaceId, { limit });

  return rows.map((row) => ({
    evidenceId: row.id,
    entityType: row.entity_type,
    displayName:
      row.extracted_fields?.name?.value ??
      row.extracted_fields?.title?.value ??
      row.identifier,
    identifier: row.identifier,
    confidencePercent: Math.round(row.confidencePercent),
    signalCount: row.signals.length,
    canCreate:
      CREATABLE_TYPES.has(row.entity_type) &&
      hasRequiredFields(row.entity_type, row.extracted_fields),
  }));
}

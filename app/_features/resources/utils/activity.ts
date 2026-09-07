/**
 * File Activity mappers — keep in sync with Overview surfaces.
 *
 * When adding a new Overview section or editable field on File detail:
 * 1. Add mapper(s) here → ProfileActivityTimelineEntry
 * 2. Fetch in getFileSupplementalActivity / getFileActivityFeed (queries.ts)
 * 3. Wire FileActivityTab + unit test in activity.test.ts
 *
 * Full checklist: docs/guides/memory-activity-parity.md
 *
 * Provenance: profile_field_provenance admits 'resource' (files→resources
 * rename, 20260810150000). Salt's writes (content analysis via
 * memoryUpdateField) and manual inline edits (updateMemoryFileField /
 * updateMemoryFileCategory) both record rows; getFileProvenanceActivity
 * renders them and mapFileRecordBootstrapActivity suppresses the bootstrap
 * guesses those rows replace.
 *
 * Known gaps:
 * - Bootstrap entries (mapFileRecordBootstrapActivity) date metadata to
 *   updated_at because per-field set timestamps don't exist for files.
 * - Tag removal is not recorded (resource_tag_assignments rows are deleted).
 */
import type {
  ProfileActivityTimelineEntry,
  PersonActivityKind,
} from "@/app/_features/people/utils/activity";
import {
  buildGenericRecordActivityAskSaltPrompt,
  profileFieldLabel,
} from "@/app/_features/people/utils/activity";
import type { ProfileFieldProvenanceView } from "@/app/_features/plays/playbooks/records-engine/types";
import { FILE_CATEGORY_LABEL } from "../data";
import type { FileCategory } from "../data";
import type {
  FileActivityEvent,
  FileActivityType,
  FileDetailRecord,
  FileDocumentType,
  FileLifecycleStatus,
} from "../detail-types";
import {
  FILE_DOCUMENT_TYPE_LABEL,
  FILE_LIFECYCLE_STATUS_LABEL,
} from "./detail-mapper";

// ============================================================================
// Activity Type Display
// ============================================================================

// entity_links rows use the short dialect (org, billing, …).
const FILE_LINK_TYPE_LABEL: Record<string, string> = {
  person: "person",
  org: "organization",
  work: "work",
  billing: "payment",
  meeting: "meeting",
  note: "note",
  conversation: "conversation",
  space: "space",
};

function formatLifecycleStatus(status: string): string {
  return (
    FILE_LIFECYCLE_STATUS_LABEL[status as FileLifecycleStatus] ??
    status.replace(/_/g, " ")
  );
}

function formatDocumentType(documentType: string): string {
  return (
    FILE_DOCUMENT_TYPE_LABEL[documentType as FileDocumentType] ??
    documentType.replace(/_/g, " ")
  );
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolveActivityKind(activityType: FileActivityType): PersonActivityKind {
  switch (activityType) {
    case "extraction_completed":
      return "salt";
    case "follow_up_created":
      return "ai";
    case "lifecycle_changed":
    case "metadata_updated":
      return "salt";
    default:
      return "user";
  }
}

function buildActivityLabel(event: FileActivityEvent): string {
  const { activityType, metadata } = event;

  switch (activityType) {
    case "uploaded":
      return "You uploaded this file";
    case "viewed":
      return "You viewed this file";
    case "downloaded":
      return "You downloaded this file";
    case "shared":
      return "You shared this file";
    case "sent":
      return "You sent this file";
    case "signed":
      return "Document signed";
    case "signature_requested":
      return "Signature requested";
    case "commented":
      return "Comment added";
    case "revised":
      return "You uploaded a new version";
    case "linked":
      return metadata.targetType
        ? `Connected to ${FILE_LINK_TYPE_LABEL[metadata.targetType] ?? metadata.targetType}`
        : "Connected file";
    case "unlinked":
      return metadata.targetType
        ? `Disconnected from ${FILE_LINK_TYPE_LABEL[metadata.targetType] ?? metadata.targetType}`
        : "Disconnected file";
    case "extraction_completed":
      return "Salt extracted content";
    case "metadata_updated":
      return "File details updated";
    case "lifecycle_changed":
      return "Status changed";
    case "follow_up_created":
      return "Salt suggested a follow-up";
    case "archived":
      return "You archived this file";
    case "restored":
      return "You restored this file";
    default:
      return (activityType as string).replace(/_/g, " ");
  }
}

function buildActivityDetail(event: FileActivityEvent): string | null {
  const { activityType, metadata } = event;

  switch (activityType) {
    case "shared":
      return metadata.toEmail ? `Shared with ${metadata.toEmail}` : null;

    case "sent":
      return metadata.toEmail
        ? [`Sent to ${metadata.toEmail}`, metadata.subject].filter(Boolean).join(" · ")
        : null;

    case "signed":
      return metadata.role
        ? [`Signed as ${metadata.role}`, metadata.signatureMethod?.replace(/_/g, " ")]
            .filter(Boolean)
            .join(" · ")
        : null;

    case "signature_requested":
      return metadata.toEmail ? `Requested from ${metadata.toEmail}` : null;

    case "linked":
    case "unlinked":
      return metadata.targetLabel ?? null;

    case "extraction_completed":
      if (metadata.documentType) {
        return `Document type → ${formatDocumentType(metadata.documentType)}`;
      }
      return metadata.extractionConfidence != null
        ? `${Math.round(metadata.extractionConfidence * 100)}% confidence`
        : "Structured data pulled from the file";

    case "lifecycle_changed":
      if (metadata.fromStatus && metadata.toStatus) {
        return `${formatLifecycleStatus(metadata.fromStatus)} → ${formatLifecycleStatus(metadata.toStatus)}`;
      }
      if (metadata.toStatus) {
        return `Status → ${formatLifecycleStatus(metadata.toStatus)}`;
      }
      return null;

    case "follow_up_created":
      return metadata.playId ? "Follow-up play created" : null;

    default:
      return event.actorLabel ?? null;
  }
}

export function mapFileActivityToTimelineEntry(
  event: FileActivityEvent,
): ProfileActivityTimelineEntry {
  const linkTypes = new Set(["linked", "unlinked"]);

  return {
    id: event.id,
    at: event.createdAt,
    kind: resolveActivityKind(event.activityType),
    label: buildActivityLabel(event),
    detail: buildActivityDetail(event),
    source: event.activityType === "extraction_completed" ? "ai_fallback" : "manual",
    entityName: linkTypes.has(event.activityType)
      ? (event.metadata.targetLabel ?? event.actorLabel)
      : event.actorLabel,
  };
}

export function mapFileActivityToTimeline(
  activities: FileActivityEvent[],
): ProfileActivityTimelineEntry[] {
  return activities.map(mapFileActivityToTimelineEntry);
}

// ============================================================================
// Ask Salt Prompt
// ============================================================================

export function buildFileActivityAskSaltPrompt(
  entry: ProfileActivityTimelineEntry,
  fileName: string,
): string {
  return buildGenericRecordActivityAskSaltPrompt(`file "${fileName}"`, entry);
}

// ============================================================================
// Provenance activity (profile_field_provenance rows for entity_type
// 'resource' — Salt's memoryUpdateField writes and manual inline edits)
// ============================================================================

/** File-aware field labels; falls back to the shared snake_case humanizer. */
function fileProvenanceFieldLabel(field: string): string {
  switch (field) {
    case "document_type":
      return "document type";
    case "lifecycle_status":
      return "status";
    case "total_amount_cents":
      return "total amount";
    case "is_operator_asset":
      return "business asset";
    default:
      return profileFieldLabel(field);
  }
}

/** Pretty-print a provenance value for known file fields (slugs → labels). */
function fileProvenanceValueLabel(field: string, value: string | null): string | null {
  if (value == null || value === "") return null;
  switch (field) {
    case "category":
      return FILE_CATEGORY_LABEL[value as FileCategory] ?? value;
    case "document_type":
      return formatDocumentType(value);
    case "lifecycle_status":
      return formatLifecycleStatus(value);
    default:
      return value;
  }
}

/** Fields that read naturally as "set the X" rather than "updated X". */
const SET_PHRASE_FIELDS = new Set([
  "category",
  "document_type",
  "due_date",
  "expiry_date",
  "signed_date",
  "follow_up_date",
]);

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Map one profile_field_provenance row to a timeline entry with honest
 * attribution: manual edits read "You …", everything Salt wrote (enrichment,
 * care, rules, AI fallback) reads "Salt …". Sources beyond the
 * ProfileProvenanceSource union (enrichment, cron, …) land in the Salt
 * branch by design.
 */
export function mapFileProvenanceToActivity(
  provenance: ProfileFieldProvenanceView,
): ProfileActivityTimelineEntry {
  const field = fileProvenanceFieldLabel(provenance.field);
  const valueLabel = fileProvenanceValueLabel(provenance.field, provenance.value);
  const detailParts = [
    valueLabel ? `${capitalize(field)} → ${valueLabel}` : null,
    provenance.because,
    provenance.confidence != null ? `${provenance.confidence}% sure` : null,
  ].filter(Boolean) as string[];

  const base = {
    id: `file-profile-${provenance.field}-${provenance.setAt}`,
    at: provenance.setAt,
    detail: detailParts.length > 0 ? detailParts.join(" · ") : null,
    field: provenance.field,
    source: provenance.source,
    status: provenance.status,
  };

  if (provenance.source === "manual") {
    return {
      ...base,
      kind: "user",
      label: SET_PHRASE_FIELDS.has(provenance.field)
        ? `You set the ${field}`
        : `You updated ${field}`,
    };
  }

  if (provenance.status === "pending") {
    return { ...base, kind: "salt", label: `Salt suggested ${field}` };
  }

  return {
    ...base,
    kind: "salt",
    label: SET_PHRASE_FIELDS.has(provenance.field)
      ? `Salt set the ${field}`
      : `Salt updated ${field}`,
  };
}

// ============================================================================
// Supplemental activity (tags, links, record bootstrap)
// ============================================================================

export function mapFileLinkToActivityEntry(input: {
  id: string;
  targetType: string;
  targetLabel: string;
  targetHref?: string;
  createdAt: string;
}): ProfileActivityTimelineEntry {
  const typeLabel = FILE_LINK_TYPE_LABEL[input.targetType] ?? input.targetType;

  return {
    id: `file-link-${input.id}`,
    at: input.createdAt,
    kind: "user",
    label: `Connected to ${typeLabel}`,
    detail: input.targetLabel,
    entityName: input.targetLabel,
    entityHref: input.targetHref,
  };
}

export function mapFileRecordBootstrapActivity(
  file: Pick<
    FileDetailRecord,
    | "id"
    | "fileName"
    | "fileType"
    | "createdAt"
    | "updatedAt"
    | "archivedAt"
    | "extractionStatus"
    | "documentType"
    | "lifecycleStatus"
    | "aiSummary"
    | "category"
    | "totalAmountCents"
    | "currency"
    | "dueDate"
    | "expiryDate"
    | "signedDate"
    | "uploadedBy"
  >,
  loggedActivities: FileActivityEvent[] = [],
  provenanceFields: ReadonlySet<string> = new Set(),
): ProfileActivityTimelineEntry[] {
  const loggedTypes = new Set(loggedActivities.map((activity) => activity.activityType));
  const entries: ProfileActivityTimelineEntry[] = [];

  if (!loggedTypes.has("uploaded")) {
    // uploaded_by is null on system-created records (attach-artifact and
    // other Salt intake flows) — attribute those to Salt, not the user.
    const addedBySalt = file.uploadedBy == null;
    entries.push({
      id: `file-created-${file.id}`,
      at: file.createdAt,
      kind: addedBySalt ? "salt" : "user",
      label:
        file.fileType === "link"
          ? addedBySalt
            ? "Salt added this link"
            : "You added this link"
          : addedBySalt
            ? "Salt added this file"
            : "You uploaded this file",
      detail: file.fileName,
    });
  }

  // Field-state bootstrap entries are guesses of last resort: once a
  // provenance row exists for a field, that row renders with the real
  // actor and the guess would duplicate (or misattribute) it.
  if (file.category && !provenanceFields.has("category")) {
    entries.push({
      id: `file-category-${file.id}`,
      at: file.updatedAt,
      kind: "user",
      label: "You set the category",
      detail: `Category → ${FILE_CATEGORY_LABEL[file.category]}`,
    });
  }

  if (
    file.documentType &&
    file.extractionStatus !== "completed" &&
    !loggedTypes.has("extraction_completed") &&
    !provenanceFields.has("document_type")
  ) {
    entries.push({
      id: `file-document-type-${file.id}`,
      at: file.updatedAt,
      kind: "user",
      label: "You set document type",
      detail: `Document type → ${formatDocumentType(file.documentType)}`,
    });
  }

  if (
    file.lifecycleStatus &&
    file.lifecycleStatus !== "archived" &&
    !provenanceFields.has("lifecycle_status")
  ) {
    entries.push({
      id: `file-lifecycle-${file.id}-${file.lifecycleStatus}`,
      at: file.updatedAt,
      kind: "salt",
      label: "Status updated",
      detail: `Status → ${formatLifecycleStatus(file.lifecycleStatus)}`,
    });
  }

  if (
    file.totalAmountCents != null &&
    file.totalAmountCents > 0 &&
    !provenanceFields.has("total_amount_cents")
  ) {
    entries.push({
      id: `file-amount-${file.id}`,
      at: file.updatedAt,
      kind: "salt",
      label: "Amount identified",
      detail: `Total → ${formatMoney(file.totalAmountCents, file.currency ?? "USD")}`,
    });
  }

  if (file.dueDate && !provenanceFields.has("due_date")) {
    entries.push({
      id: `file-due-${file.id}`,
      at: file.updatedAt,
      kind: "salt",
      label: "Due date set",
      detail: `Due → ${formatDisplayDate(file.dueDate)}`,
    });
  }

  if (file.expiryDate && !provenanceFields.has("expiry_date")) {
    entries.push({
      id: `file-expiry-${file.id}`,
      at: file.updatedAt,
      kind: "salt",
      label: "Expiry date set",
      detail: `Expires → ${formatDisplayDate(file.expiryDate)}`,
    });
  }

  if (file.signedDate && !provenanceFields.has("signed_date")) {
    entries.push({
      id: `file-signed-date-${file.id}`,
      at: file.signedDate,
      kind: "user",
      label: "Signed date recorded",
      detail: `Signed → ${formatDisplayDate(file.signedDate)}`,
    });
  }

  if (file.extractionStatus === "completed" && !loggedTypes.has("extraction_completed")) {
    entries.push({
      id: `file-extraction-${file.id}`,
      at: file.updatedAt,
      kind: "salt",
      label: "Salt extracted content",
      detail: file.documentType
        ? `Document type → ${formatDocumentType(file.documentType)}`
        : "Structured data pulled from the file",
    });
  }

  if (file.aiSummary?.trim()) {
    entries.push({
      id: `file-summary-${file.id}`,
      at: file.updatedAt,
      kind: "ai",
      label: "Salt refreshed the summary",
      detail: "Rewrote the file summary from extracted content.",
    });
  }

  if (file.archivedAt && !loggedTypes.has("archived")) {
    entries.push({
      id: `file-archived-${file.id}`,
      at: file.archivedAt,
      kind: "user",
      label: "You archived this file",
      detail: null,
    });
  }

  return entries;
}

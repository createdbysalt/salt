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
 * Known gaps (blocked on schema — do not work around here):
 * - Inline file field edits write no provenance: profile_field_provenance's
 *   entity_type CHECK admits person/organization/work/operator/workspace only,
 *   so metadata edits surface via file_activities/bootstrap entries, not
 *   provenance events.
 * - notes' entity_type CHECK admits person/organization/work only; the 'file'
 *   notes query in getFileSupplementalActivity returns rows once the CHECK is
 *   widened.
 * - Bootstrap entries (mapFileRecordBootstrapActivity) date metadata to
 *   updated_at because per-field set timestamps don't exist for files.
 * - Tag removal is not recorded (file_tag_assignments rows are deleted).
 */
import type {
  ProfileActivityTimelineEntry,
  PersonActivityKind,
} from "@/app/_features/people/utils/activity";
import { buildGenericRecordActivityAskSaltPrompt } from "@/app/_features/people/utils/activity";
import { FILE_CATEGORY_LABEL } from "../data";
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
  >,
  loggedActivities: FileActivityEvent[] = [],
): ProfileActivityTimelineEntry[] {
  const loggedTypes = new Set(loggedActivities.map((activity) => activity.activityType));
  const entries: ProfileActivityTimelineEntry[] = [];

  if (!loggedTypes.has("uploaded")) {
    entries.push({
      id: `file-created-${file.id}`,
      at: file.createdAt,
      kind: "user",
      label: file.fileType === "link" ? "You added this link" : "You uploaded this file",
      detail: file.fileName,
    });
  }

  if (file.category) {
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
    !loggedTypes.has("extraction_completed")
  ) {
    entries.push({
      id: `file-document-type-${file.id}`,
      at: file.updatedAt,
      kind: "user",
      label: "You set document type",
      detail: `Document type → ${formatDocumentType(file.documentType)}`,
    });
  }

  if (file.lifecycleStatus && file.lifecycleStatus !== "archived") {
    entries.push({
      id: `file-lifecycle-${file.id}-${file.lifecycleStatus}`,
      at: file.updatedAt,
      kind: "salt",
      label: "Status updated",
      detail: `Status → ${formatLifecycleStatus(file.lifecycleStatus)}`,
    });
  }

  if (file.totalAmountCents != null && file.totalAmountCents > 0) {
    entries.push({
      id: `file-amount-${file.id}`,
      at: file.updatedAt,
      kind: "salt",
      label: "Amount identified",
      detail: `Total → ${formatMoney(file.totalAmountCents, file.currency ?? "USD")}`,
    });
  }

  if (file.dueDate) {
    entries.push({
      id: `file-due-${file.id}`,
      at: file.updatedAt,
      kind: "salt",
      label: "Due date set",
      detail: `Due → ${formatDisplayDate(file.dueDate)}`,
    });
  }

  if (file.expiryDate) {
    entries.push({
      id: `file-expiry-${file.id}`,
      at: file.updatedAt,
      kind: "salt",
      label: "Expiry date set",
      detail: `Expires → ${formatDisplayDate(file.expiryDate)}`,
    });
  }

  if (file.signedDate) {
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

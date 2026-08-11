/**
 * Work Activity mappers — keep in sync with Overview surfaces.
 *
 * When adding a new Overview section or editable field on Work detail:
 * 1. Add mapper(s) here → ProfileActivityTimelineEntry
 * 2. Fetch in getWorkSupplementalActivity (queries.ts) OR use profile_field_provenance
 * 3. Wire WorkActivityTab + unit test in activity.test.ts
 *
 * Full checklist: docs/guides/memory-activity-parity.md
 */
import type {
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "@/app/_features/plays/playbooks/records-engine/types";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import type {
  WorkActivityEvent,
  WorkBlocker,
  WorkBlockerType,
  WorkProfileFieldProvenanceView,
} from "@/app/_features/work/types";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";
import { fromUnitInterval } from "@/app/_features/memory/lib/confidence";

const BLOCKER_TYPE_LABELS: Record<WorkBlockerType, string> = {
  awaiting_reply: "Awaiting reply",
  meeting_cancelled: "Meeting cancelled",
  approval_pending: "Approval pending",
  asset_pending: "Asset pending",
  payment_pending: "Payment pending",
  dependency: "Dependency",
  resource_unavailable: "Resource unavailable",
  custom: "Other",
};

export function blockerTypeLabel(blockerType: WorkBlockerType): string {
  return BLOCKER_TYPE_LABELS[blockerType] ?? blockerType;
}

export function mapBlockerToActivityEntries(blocker: WorkBlocker): ProfileActivityTimelineEntry[] {
  const typeLabel = blockerTypeLabel(blocker.blockerType);
  const entries: ProfileActivityTimelineEntry[] = [];
  const createdDetail = [typeLabel, blocker.title, blocker.detail].filter(Boolean).join(" · ");

  entries.push({
    id: `blocker-created-${blocker.id}`,
    at: blocker.detectedAt,
    kind: blocker.source === "user_flagged" ? "user" : "salt",
    label: blocker.source === "user_flagged" ? "You flagged a blocker" : "Salt detected a blocker",
    detail: createdDetail || null,
  });

  if (blocker.status === "resolved" && blocker.resolvedAt) {
    entries.push({
      id: `blocker-resolved-${blocker.id}`,
      at: blocker.resolvedAt,
      kind: "user",
      label: "Blocker resolved",
      detail: [typeLabel, blocker.title].filter(Boolean).join(" · ") || null,
    });
  }

  if (blocker.status === "dismissed" && blocker.resolvedAt) {
    entries.push({
      id: `blocker-dismissed-${blocker.id}`,
      at: blocker.resolvedAt,
      kind: "user",
      label: "Marked not blocking",
      detail: [typeLabel, blocker.title].filter(Boolean).join(" · ") || null,
    });
  }

  return entries;
}

export function mapTagAssignmentToActivityEntry(input: {
  id: string;
  tagLabel: string;
  source: "manual" | "care" | "system";
  because: string | null;
  confidence: number | null;
  createdAt: string;
}): ProfileActivityTimelineEntry {
  const detailParts = [
    input.tagLabel,
    input.because,
    input.confidence != null ? `${fromUnitInterval(input.confidence)}% sure` : null,
  ].filter(Boolean);

  return {
    id: `tag-assigned-${input.id}`,
    at: input.createdAt,
    kind: input.source === "manual" ? "user" : input.source === "care" ? "salt" : "system",
    label:
      input.source === "manual"
        ? "You added a tag"
        : input.source === "care"
          ? "Salt added a tag"
          : "Tag applied",
    detail: detailParts.join(" · ") || null,
  };
}

export function workProfileFieldLabel(field: string): string {
  return field.replaceAll("_", " ");
}

export function mapWorkProvenanceToActivity(
  provenance: WorkProfileFieldProvenanceView,
): WorkActivityEvent {
  const field = workProfileFieldLabel(provenance.field);
  const valueLabel = provenance.value ?? "—";
  const detailParts = [
    provenance.because ?? "Based on trusted work-record evidence.",
    provenance.confidence != null ? `${provenance.confidence}% sure` : null,
  ].filter(Boolean) as string[];

  if (provenance.source === "manual") {
    return {
      id: `work-profile-${provenance.field}-${provenance.setAt}`,
      at: provenance.setAt,
      kind: "user",
      label: `You updated ${field}`,
      detail: `${field} → ${valueLabel} · ${detailParts.join(" · ")}`,
      field: provenance.field,
      source: provenance.source,
      status: provenance.status,
    };
  }

  if (provenance.source === "ai_fallback") {
    const action = provenance.status === "pending" ? "suggested" : "inferred";
    return {
      id: `work-profile-${provenance.field}-${provenance.setAt}`,
      at: provenance.setAt,
      kind: "salt",
      label: `Salt ${action} ${field}`,
      detail: `${field} → ${valueLabel} · ${detailParts.join(" · ")}`,
      field: provenance.field,
      source: provenance.source,
      status: provenance.status,
    };
  }

  const action = provenance.status === "pending" ? "suggested" : "updated";
  return {
    id: `work-profile-${provenance.field}-${provenance.setAt}`,
    at: provenance.setAt,
    kind: "salt",
    label: `Salt ${action} ${field}`,
    detail: `${field} → ${valueLabel} · ${detailParts.join(" · ")}`,
    field: provenance.field,
    source: provenance.source,
    status: provenance.status,
  };
}

export function buildWorkActivityAskSaltPrompt(
  entry: WorkActivityEvent,
  workTitle: string,
): string {
  const field = workProfileFieldLabel(entry.field);
  if (entry.status === "pending") {
    return `On ${workTitle}, Salt suggested ${field}${entry.detail ? ` (${entry.detail})` : ""}. I want to review or change this.`;
  }
  return `On ${workTitle}: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. I want to review or change this.`;
}

// entity_links rows use the short dialect (org, billing, …); long-dialect keys
// remain for legacy rows written before the rename.
const ENTITY_TYPE_LABELS: Record<string, string> = {
  person: "person",
  org: "organization",
  organization: "organization",
  work: "work",
  project: "work",
  billing: "payment",
  billing_record: "payment",
  note: "note",
  conversation: "conversation",
  meeting: "meeting",
  client_meeting: "meeting",
  file: "resource",
  resource: "resource",
  space: "space",
};

function entityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

export type ConnectionActivityInput = {
  id: string;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  relationType: string | null;
  createdAt: string;
  createdBy: string | null;
  connectedEntityName: string;
  connectedEntityHref?: string;
};

export function mapConnectionToActivityEntry(
  input: ConnectionActivityInput,
  thisEntityType: string,
  thisEntityId: string,
): ProfileActivityTimelineEntry {
  const isOutgoing =
    input.fromEntityType === thisEntityType && input.fromEntityId === thisEntityId;
  const otherType = isOutgoing ? input.toEntityType : input.fromEntityType;
  const typeLabel = entityTypeLabel(otherType);

  return {
    id: `connection-created-${input.id}`,
    at: input.createdAt,
    kind: input.createdBy ? "user" : "system",
    label: `Connected to ${typeLabel}`,
    detail: input.connectedEntityHref ? null : input.connectedEntityName,
    entityName: input.connectedEntityName,
    entityHref: input.connectedEntityHref,
  };
}

export interface NoteActivityEntry {
  id: string;
  at: string;
  kind: "user" | "salt" | "system";
  label: string;
  detail: string | null;
  field: "note";
  source: "manual" | "ai_fallback";
  status: "applied";
}

export function mapNoteToActivityEntry(note: EntityNoteWithProvenance): NoteActivityEntry {
  const isUserNote = note.authorType === "user" || note.source === "manual";
  const isSaltNote = note.authorType === "salt" || note.source === "ai_capture" || note.source === "ai_inference";

  let label: string;
  let kind: "user" | "salt" | "system";

  if (isUserNote) {
    label = "You added a note";
    kind = "user";
  } else if (isSaltNote) {
    label = note.source === "ai_capture" ? "Salt captured a note" : "Salt added a note";
    kind = "salt";
  } else {
    label = "Note added";
    kind = "system";
  }

  const detailParts: string[] = [];
  if (note.title) {
    detailParts.push(note.title);
  }
  if (note.tags && note.tags.length > 0) {
    detailParts.push(note.tags.join(", "));
  }
  if (!note.title && note.content) {
    const preview = note.content.length > 60 ? `${note.content.slice(0, 60)}…` : note.content;
    detailParts.push(preview);
  }

  return {
    id: `note-created-${note.id}`,
    at: note.createdAt,
    kind,
    label,
    detail: detailParts.length > 0 ? detailParts.join(" · ") : null,
    field: "note",
    source: isUserNote ? "manual" : "ai_fallback",
    status: "applied",
  };
}

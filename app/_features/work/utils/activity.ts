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
} from "@/app/_features/plays/playbooks/profile/types";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import type {
  WorkActivityEvent,
  WorkBlocker,
  WorkBlockerType,
  WorkProfileFieldProvenanceView,
} from "@/app/_features/work/types";

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
    kind: blocker.source === "user_flagged" ? "user" : "keeper",
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
  source: "manual" | "keeper" | "system";
  because: string | null;
  confidence: number | null;
  createdAt: string;
}): ProfileActivityTimelineEntry {
  const detailParts = [
    input.tagLabel,
    input.because,
    input.confidence != null ? `${Math.round(input.confidence * 100)}% sure` : null,
  ].filter(Boolean);

  return {
    id: `tag-assigned-${input.id}`,
    at: input.createdAt,
    kind: input.source === "manual" ? "user" : input.source === "keeper" ? "keeper" : "system",
    label:
      input.source === "manual"
        ? "You added a tag"
        : input.source === "keeper"
          ? "Keeper added a tag"
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
      kind: "keeper",
      label: `Keeper ${action} ${field}`,
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
    kind: "keeper",
    label: `Keeper ${action} ${field}`,
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
    return `On ${workTitle}, Keeper suggested ${field}${entry.detail ? ` (${entry.detail})` : ""}. I want to review or change this.`;
  }
  return `On ${workTitle}: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. I want to review or change this.`;
}

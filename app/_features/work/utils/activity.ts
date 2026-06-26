import type {
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "@/app/_features/plays/playbooks/profile/types";
import type { WorkActivityEvent, WorkProfileFieldProvenanceView } from "@/app/_features/work/types";

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

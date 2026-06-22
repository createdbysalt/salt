import type {
  ProfileFieldProvenanceView,
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "@/app/_features/plays/playbooks/profile/types";

export type PersonActivityKind = "keeper" | "ai" | "user" | "system";

export interface PersonActivityEvent {
  id: string;
  at: string;
  kind: PersonActivityKind;
  label: string;
  detail: string | null;
  field: ProfileFieldProvenanceView["field"];
  source: ProfileProvenanceSource;
  status: ProfileProvenanceStatus;
}

export function profileFieldLabel(field: string): string {
  switch (field) {
    case "relationship_type":
      return "relationship";
    case "title":
      return "job title";
    case "org_link":
      return "organization";
    default:
      return field.replaceAll("_", " ");
  }
}

export function mapProvenanceToActivity(
  provenance: ProfileFieldProvenanceView,
): PersonActivityEvent {
  const field = profileFieldLabel(provenance.field);
  const confidence = provenance.confidence != null ? `${provenance.confidence}% sure` : null;
  const detailParts = [provenance.because ?? "Based on trusted person-record evidence.", confidence].filter(Boolean);

  if (provenance.source === "manual") {
    return {
      id: `profile-${provenance.field}-${provenance.setAt}`,
      at: provenance.setAt,
      kind: "user",
      label: `You updated ${field}`,
      detail: detailParts.join(" · "),
      field: provenance.field,
      source: provenance.source,
      status: provenance.status,
    };
  }

  if (provenance.source === "ai_fallback") {
    const action = provenance.status === "pending" ? "suggested" : "inferred";
    return {
      id: `profile-${provenance.field}-${provenance.setAt}`,
      at: provenance.setAt,
      kind: "ai",
      label: `Keeper ${action} ${field}`,
      detail: detailParts.join(" · "),
      field: provenance.field,
      source: provenance.source,
      status: provenance.status,
    };
  }

  const action = provenance.status === "pending" ? "suggested" : "updated";
  return {
    id: `profile-${provenance.field}-${provenance.setAt}`,
    at: provenance.setAt,
    kind: "keeper",
    label: `Keeper ${action} ${field}`,
    detail: detailParts.join(" · "),
    field: provenance.field,
    source: provenance.source,
    status: provenance.status,
  };
}

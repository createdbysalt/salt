import type { OrgActivityEvent, OrgProfileFieldKey, OrgProfileFieldProvenanceView } from "@/app/_features/orgs/types";
import { formatRelationshipLabel } from "@/app/_features/plays/playbooks/profile/resolve-rules";

export function orgProfileFieldLabel(field: string): string {
  switch (field as OrgProfileFieldKey) {
    case "website":
      return "domain";
    case "industry":
      return "industry";
    case "relationship_status":
      return "relationship";
    case "key_contact":
      return "key contact";
    default:
      return field.replaceAll("_", " ");
  }
}

export function mapOrgProvenanceToActivity(provenance: OrgProfileFieldProvenanceView): OrgActivityEvent {
  const field = orgProfileFieldLabel(provenance.field);
  const valueLabel =
    provenance.field === "relationship_status"
      ? formatRelationshipLabel(provenance.value)
      : (provenance.value ?? "—");
  const detailParts = [
    provenance.because ?? "Based on trusted organization-record evidence.",
    provenance.confidence != null ? `${provenance.confidence}% sure` : null,
  ].filter(Boolean) as string[];

  if (provenance.source === "manual") {
    return {
      id: `org-profile-${provenance.field}-${provenance.setAt}`,
      at: provenance.setAt,
      kind: "user",
      label: `You updated ${field}`,
      detail: `${field} → ${valueLabel} · ${detailParts.join(" · ")}`,
      field: provenance.field as OrgActivityEvent["field"],
      source: provenance.source,
      status: provenance.status,
    };
  }

  if (provenance.source === "ai_fallback") {
    const action = provenance.status === "pending" ? "suggested" : "inferred";
    return {
      id: `org-profile-${provenance.field}-${provenance.setAt}`,
      at: provenance.setAt,
      kind: "keeper",
      label: `Keeper ${action} ${field}`,
      detail: `${field} → ${valueLabel} · ${detailParts.join(" · ")}`,
      field: provenance.field as OrgActivityEvent["field"],
      source: provenance.source,
      status: provenance.status,
    };
  }

  return {
    id: `org-profile-${provenance.field}-${provenance.setAt}`,
    at: provenance.setAt,
    kind: "keeper",
    label: `Keeper filled ${field}`,
    detail: `${field} → ${valueLabel} · ${detailParts.join(" · ")}`,
    field: provenance.field as OrgActivityEvent["field"],
    source: provenance.source,
    status: provenance.status,
  };
}

export function buildOrgActivityAskSaltPrompt(entry: OrgActivityEvent, orgName: string): string {
  const field = orgProfileFieldLabel(entry.field);
  if (entry.status === "pending") {
    return `On ${orgName}'s profile, Keeper suggested ${field}${entry.detail ? ` (${entry.detail})` : ""}. I want to review or change this.`;
  }
  return `On ${orgName}'s profile: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. I want to review or change this.`;
}

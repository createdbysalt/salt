import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import type { RelationshipType as DemoRelationshipType } from "@/app/_lib/demo/people-demo-data";

const PROFILE_TO_PERSON_DISPLAY: Record<RelationshipType, DemoRelationshipType> = {
  client: "Client",
  prospect: "Prospect",
  team: "Internal",
  partner: "Partner",
  vendor: "Vendor",
  personal: "Personal",
  unknown: "Unknown",
};

const PERSON_DISPLAY_TO_PROFILE: Partial<Record<DemoRelationshipType, RelationshipType>> = {
  Client: "client",
  Prospect: "prospect",
  Internal: "team",
  Partner: "partner",
  Vendor: "vendor",
  Personal: "personal",
  Unknown: "unknown",
};

export function relationshipDisplayLabel(value: string | null): string {
  if (!value) return "Unknown";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function profileRelationshipToPersonDisplay(value: RelationshipType | null): DemoRelationshipType {
  return value ? PROFILE_TO_PERSON_DISPLAY[value] : "Unknown";
}

export function personDisplayToProfileRelationship(value: DemoRelationshipType): RelationshipType | null {
  return PERSON_DISPLAY_TO_PROFILE[value] ?? null;
}

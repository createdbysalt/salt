import type { RelationshipStatus } from "@/app/_features/relationships/types";
import type { RelationshipType as DemoRelationshipType } from "@/app/_lib/demo/people-demo-data";

const DB_TO_DISPLAY: Record<RelationshipStatus, DemoRelationshipType> = {
  client: "Client",
  prospect: "Prospect",
  partner: "Partner",
  vendor: "Vendor",
  past_client: "Past client",
  other: "Unknown",
};

const DISPLAY_TO_DB: Partial<Record<DemoRelationshipType, RelationshipStatus>> = {
  Client: "client",
  Prospect: "prospect",
  Partner: "partner",
  Vendor: "vendor",
  "Past client": "past_client",
  Internal: "other",
  Personal: "other",
  Unknown: "prospect",
};

export function orgStatusToDisplay(value: RelationshipStatus | null): DemoRelationshipType {
  return value ? DB_TO_DISPLAY[value] : "Prospect";
}

export function orgDisplayToStatus(value: DemoRelationshipType): RelationshipStatus | null {
  return DISPLAY_TO_DB[value] ?? null;
}

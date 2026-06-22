import type { RelationshipStatus } from "@/app/_features/relationships/types";
import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";

export function relationshipTypeToStatus(value: RelationshipType | undefined): RelationshipStatus {
  switch (value) {
    case "client":
      return "client";
    case "prospect":
      return "prospect";
    case "partner":
      return "partner";
    case "vendor":
      return "vendor";
    case "team":
    case "personal":
    case "unknown":
    case undefined:
      return "other";
  }
}

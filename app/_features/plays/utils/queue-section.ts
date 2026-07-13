import type { FindingType } from "@/app/_features/capture/types/intelligence-findings";
import type { PlayerId } from "@/app/_lib/demo/plays-demo-data";
import type { LearningEntityType } from "@/app/_lib/learning";
import type { PlaybookSection } from "@/app/_features/plays/playbooks/schema/v2/types";

export type QueueSectionFilter = Exclude<
  PlaybookSection,
  "all" | "connections" | "notes"
>;

export const QUEUE_SECTION_ORDER: QueueSectionFilter[] = [
  "relationships",
  "work",
  "billing",
  "files",
  "meetings",
  "me",
  "_meta",
];

export function getSectionFromFindingType(type: FindingType): QueueSectionFilter {
  if (type.startsWith("revenue_")) return "billing";
  if (type.startsWith("pending_")) return "relationships";
  if (
    type === "new_person" ||
    type === "new_org" ||
    type === "needs_routing" ||
    type === "referral"
  ) {
    return "relationships";
  }
  return "_meta";
}

export function getSectionFromQueuePlay(playerId: PlayerId): QueueSectionFilter {
  switch (playerId) {
    case "follow-up":
    case "client-risk":
      return "relationships";
    case "billing":
      return "billing";
    case "keeper":
      return "_meta";
    case "brief":
    case "scope":
    case "general":
    default:
      return "work";
  }
}

export function getSectionFromLearningEntity(
  entityType: LearningEntityType,
): QueueSectionFilter {
  switch (entityType) {
    case "person":
    case "organization":
      return "relationships";
    case "work":
      return "work";
    case "billing":
      return "billing";
    case "file":
      return "files";
    case "meeting":
      return "meetings";
    case "me":
      return "me";
    default:
      return "_meta";
  }
}

export function matchesSectionFilter(
  sections: QueueSectionFilter[],
  section: QueueSectionFilter,
): boolean {
  return sections.length === 0 || sections.includes(section);
}

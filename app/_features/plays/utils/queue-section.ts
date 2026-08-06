import type { FindingType } from "@/app/_features/capture/types/intelligence-findings";
import type { LearningEntityType } from "@/app/_lib/learning";
import type { PlaybookSection } from "@/app/_features/plays/playbooks/schema/v2/types";
import type { PlayRunRow } from "../types";

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

export function getSectionFromPlayRun(play: PlayRunRow): QueueSectionFilter {
  const metadataSection = play.metadata?.section;
  if (
    typeof metadataSection === "string" &&
    QUEUE_SECTION_ORDER.includes(metadataSection as QueueSectionFilter)
  ) {
    return metadataSection as QueueSectionFilter;
  }

  const slug = play.player_slug ?? play.source_context?.playbook_slug;
  if (!slug) return "work";

  if (slug.includes("follow-up") || slug.includes("client-risk") || slug.includes("person") || slug.includes("org")) {
    return "relationships";
  }
  if (slug.includes("billing") || slug.includes("invoice") || slug.includes("payment")) {
    return "billing";
  }
  if (slug.includes("keeper") || slug.includes("meta") || slug.includes("intake")) {
    return "_meta";
  }
  if (slug.includes("meeting") || slug.includes("calendar")) {
    return "meetings";
  }
  if (slug.includes("file")) {
    return "files";
  }
  return "work";
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

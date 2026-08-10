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
  "resources",
  "meetings",
  "me",
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
  return "work";
}

export function getSectionFromPlayRun(play: PlayRunRow): QueueSectionFilter {
  const metadataSection = play.metadata?.section;
  if (typeof metadataSection === "string") {
    // Legacy play runs may still store section "files".
    const normalized =
      metadataSection === "files" ? "resources" : metadataSection;
    if (QUEUE_SECTION_ORDER.includes(normalized as QueueSectionFilter)) {
      return normalized as QueueSectionFilter;
    }
  }

  const slug = play.player_slug ?? play.source_context?.playbook_slug;
  if (!slug) return "work";

  if (slug.includes("follow-up") || slug.includes("client-risk") || slug.includes("person") || slug.includes("org")) {
    return "relationships";
  }
  if (slug.includes("billing") || slug.includes("invoice") || slug.includes("payment")) {
    return "billing";
  }
  if (slug.includes("meeting") || slug.includes("calendar")) {
    return "meetings";
  }
  if (slug.includes("file") || slug.includes("resource")) {
    return "resources";
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
    case "resource":
      return "resources";
    case "meeting":
      return "meetings";
    case "me":
      return "me";
    default:
      return "work";
  }
}

export function matchesSectionFilter(
  sections: QueueSectionFilter[],
  section: QueueSectionFilter,
): boolean {
  return sections.length === 0 || sections.includes(section);
}

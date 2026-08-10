import {
  MEMORY_CUSTOMIZE_ENTITY_TYPES,
  type MemoryCustomizeEntityType,
} from "./customize/default-guidance";

export type MemoryTab = "map" | "activity" | "customize";

export function parseMemoryTab(value: string | null | undefined): MemoryTab {
  // "rules" is the legacy id for the Customize tab.
  if (value === "customize" || value === "rules") return "customize";
  // "filter" is the legacy id for the Activity tab.
  if (value === "activity" || value === "filter") return "activity";
  return "map";
}

/** The Customize tab's record-type param; defaults to People. */
export function parseCustomizeType(
  value: string | null | undefined,
): MemoryCustomizeEntityType {
  if (
    value != null &&
    (MEMORY_CUSTOMIZE_ENTITY_TYPES as readonly string[]).includes(value)
  ) {
    return value as MemoryCustomizeEntityType;
  }
  return "person";
}

export function buildMemoryPath(
  tab: MemoryTab,
  customizeType?: MemoryCustomizeEntityType,
): string {
  if (tab === "map") return "/memory";
  if (tab === "customize") {
    return customizeType && customizeType !== "person"
      ? `/memory?tab=customize&type=${customizeType}`
      : "/memory?tab=customize";
  }
  return "/memory?tab=activity";
}

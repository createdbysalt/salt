import {
  isMemoryCustomizeScope,
  type MemoryCustomizeScope,
} from "./customize/default-guidance";

export type MemoryTab = "map" | "activity" | "customize";

export function parseMemoryTab(value: string | null | undefined): MemoryTab {
  // "rules" is the legacy id for the Customize tab.
  if (value === "customize" || value === "rules") return "customize";
  // "filter" is the legacy id for the Activity tab.
  if (value === "activity" || value === "filter") return "activity";
  return "map";
}

/** The Customize tab's scope param (a record type or "general"); defaults to People. */
export function parseCustomizeType(
  value: string | null | undefined,
): MemoryCustomizeScope {
  if (isMemoryCustomizeScope(value)) return value;
  return "person";
}

export function buildMemoryPath(
  tab: MemoryTab,
  customizeType?: MemoryCustomizeScope,
): string {
  if (tab === "map") return "/memory";
  if (tab === "customize") {
    return customizeType && customizeType !== "person"
      ? `/memory?tab=customize&type=${customizeType}`
      : "/memory?tab=customize";
  }
  return "/memory?tab=activity";
}

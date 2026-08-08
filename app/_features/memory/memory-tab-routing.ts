export type MemoryTab = "map" | "activity" | "rules";

export function parseMemoryTab(value: string | null | undefined): MemoryTab {
  if (value === "rules") return value;
  // "filter" is the legacy id for the Activity tab.
  if (value === "activity" || value === "filter") return "activity";
  return "map";
}

export function buildMemoryPath(tab: MemoryTab): string {
  if (tab === "map") return "/memory";
  return `/memory?tab=${tab}`;
}

export type MemoryTab = "map" | "filter" | "rules";

export function parseMemoryTab(value: string | null | undefined): MemoryTab {
  if (value === "filter" || value === "rules") return value;
  return "map";
}

export function buildMemoryPath(tab: MemoryTab): string {
  if (tab === "map") return "/memory";
  return `/memory?tab=${tab}`;
}

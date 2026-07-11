export type ToolRiskFilter = "all" | "read" | "write";

export const TOOL_RISK_FILTERS: { value: ToolRiskFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "read", label: "Read" },
  { value: "write", label: "Write" },
];

interface ToolPermissionsSummaryInput {
  toolRiskFilter: ToolRiskFilter;
  toolQuery: string;
  readCount: number;
  writeCount: number;
  filteredReadCount: number;
  filteredWriteCount: number;
}

export function buildToolPermissionsSummary({
  toolRiskFilter,
  toolQuery,
  readCount,
  writeCount,
  filteredReadCount,
  filteredWriteCount,
}: ToolPermissionsSummaryInput): string {
  const searchActive = toolQuery.trim().length > 0;
  const totalCount = readCount + writeCount;

  if (toolRiskFilter === "read") {
    if (searchActive && filteredReadCount !== readCount) {
      return `${filteredReadCount} of ${readCount} read-only tools`;
    }
    return `${readCount} read-only ${readCount === 1 ? "tool" : "tools"}`;
  }

  if (toolRiskFilter === "write") {
    if (searchActive && filteredWriteCount !== writeCount) {
      return `${filteredWriteCount} of ${writeCount} write / delete tools`;
    }
    return `${writeCount} write / delete ${writeCount === 1 ? "tool" : "tools"}`;
  }

  if (searchActive) {
    const visible = filteredReadCount + filteredWriteCount;
    if (visible !== totalCount) {
      return `${visible} of ${totalCount} tools`;
    }
  }

  return `${totalCount} ${totalCount === 1 ? "tool" : "tools"} · ${readCount} read · ${writeCount} write`;
}

/** Context line shown only while search is narrowing the list. */
export function buildToolSearchSummary(
  input: ToolPermissionsSummaryInput,
): string | null {
  if (input.toolQuery.trim().length === 0) {
    return null;
  }

  const {
    toolRiskFilter,
    readCount,
    writeCount,
    filteredReadCount,
    filteredWriteCount,
  } = input;
  const totalCount = readCount + writeCount;

  if (toolRiskFilter === "read") {
    return filteredReadCount === readCount
      ? `${readCount} read-only ${readCount === 1 ? "tool" : "tools"}`
      : `${filteredReadCount} of ${readCount} read-only tools`;
  }

  if (toolRiskFilter === "write") {
    return filteredWriteCount === writeCount
      ? `${writeCount} write / delete ${writeCount === 1 ? "tool" : "tools"}`
      : `${filteredWriteCount} of ${writeCount} write / delete tools`;
  }

  const visible = filteredReadCount + filteredWriteCount;
  return visible === totalCount
    ? `${totalCount} ${totalCount === 1 ? "tool" : "tools"}`
    : `${visible} of ${totalCount} tools`;
}

export function buildToolEmptyMessage(
  toolRiskFilter: ToolRiskFilter,
  toolQuery: string,
): string {
  const searchActive = toolQuery.trim().length > 0;

  if (searchActive && toolRiskFilter === "read") {
    return "No read-only tools match your search.";
  }
  if (searchActive && toolRiskFilter === "write") {
    return "No write / delete tools match your search.";
  }
  if (searchActive) {
    return "No tools match your search.";
  }
  if (toolRiskFilter === "read") {
    return "No read-only tools.";
  }
  if (toolRiskFilter === "write") {
    return "No write / delete tools.";
  }
  return "No tools.";
}

export function shouldShowToolSection(
  toolRiskFilter: ToolRiskFilter,
  section: "read" | "write",
  filteredCount: number,
): boolean {
  if (filteredCount === 0) {
    return false;
  }
  if (toolRiskFilter === "all") {
    return true;
  }
  return toolRiskFilter === section;
}

"use client";

import { Loader2, Search } from "lucide-react";
import { cn } from "@repo/utils";
import type { SaveQueueStatus } from "../../hooks/save-queue";
import { ToolRiskFilterControl } from "./tool-risk-filter-control";
import { buildToolSearchSummary, type ToolRiskFilter } from "./tool-risk-filter";

interface ToolPermissionsToolbarProps {
  toolQuery: string;
  onToolQueryChange: (value: string) => void;
  toolRiskFilter: ToolRiskFilter;
  onToolRiskFilterChange: (value: ToolRiskFilter) => void;
  readCount: number;
  writeCount: number;
  filteredReadCount: number;
  filteredWriteCount: number;
  saveStatus?: SaveQueueStatus;
  /** Modal uses squared inputs; pane uses the default rounded toolbar. */
  variant?: "pane" | "modal";
}

function ToolSaveStatus({ status }: { status: SaveQueueStatus }) {
  if (status === "idle") {
    return null;
  }

  const saving = status === "pending" || status === "saving";

  return (
    <span
      aria-live="polite"
      className="inline-flex shrink-0 items-center gap-1.5 px-1 text-xs text-muted-foreground"
    >
      {saving ? <Loader2 className="size-3 animate-spin" /> : null}
      {saving ? "Saving…" : "Saved"}
    </span>
  );
}

export function ToolPermissionsToolbar({
  toolQuery,
  onToolQueryChange,
  toolRiskFilter,
  onToolRiskFilterChange,
  readCount,
  writeCount,
  filteredReadCount,
  filteredWriteCount,
  saveStatus = "idle",
  variant = "pane",
}: ToolPermissionsToolbarProps) {
  const totalCount = readCount + writeCount;
  const searchSummary = buildToolSearchSummary({
    toolRiskFilter,
    toolQuery,
    readCount,
    writeCount,
    filteredReadCount,
    filteredWriteCount,
  });
  const isModal = variant === "modal";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Tool permissions</p>
        {saveStatus !== "idle" ? <ToolSaveStatus status={saveStatus} /> : null}
      </div>

      <div
        className={cn(
          "flex flex-col gap-2 border border-border/50 bg-muted/20 p-1.5 sm:flex-row sm:items-center",
          isModal ? "rounded-lg" : "rounded-xl",
        )}
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={toolQuery}
            onChange={(event) => onToolQueryChange(event.target.value)}
            placeholder={`Search ${totalCount} tools`}
            aria-label="Search tools"
            className={cn(
              "h-8 w-full border-0 bg-background pl-9 pr-3 text-sm shadow-sm outline-none ring-1 ring-border/40 transition placeholder:text-muted-foreground/80 hover:ring-border/60 focus:ring-2 focus:ring-foreground/10",
              isModal ? "rounded-md" : "rounded-lg",
            )}
          />
        </div>

        <div
          aria-hidden
          className="hidden h-6 w-px shrink-0 bg-border/50 sm:block"
        />

        <ToolRiskFilterControl
          value={toolRiskFilter}
          onChange={onToolRiskFilterChange}
          counts={{
            all: totalCount,
            read: readCount,
            write: writeCount,
          }}
        />
      </div>

      {searchSummary ? (
        <p className="text-xs text-muted-foreground">{searchSummary}</p>
      ) : null}
    </div>
  );
}

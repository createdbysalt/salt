"use client";

import {
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";

// =============================================================================
// Types
// =============================================================================

type ViewFilter = "active" | "archived" | "deleted";

interface ClientsBulkActionBarProps {
  selectedCount: number;
  viewFilter: ViewFilter;
  onClearSelection: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function ClientsBulkActionBar({
  selectedCount,
  viewFilter,
  onClearSelection,
  onArchive,
  onUnarchive,
  onTrash,
  onRestore,
  onPermanentDelete,
  className,
}: ClientsBulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "bg-background border shadow-lg rounded-lg",
        "flex items-center gap-2 px-4 py-2",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-200",
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3 border-r">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onClearSelection}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Actions based on view filter */}
      {viewFilter === "active" && (
        <>
          {onArchive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={onArchive}
            >
              <Archive className="size-4" />
              Archive
            </Button>
          )}
          {onTrash && (
            <div className="pl-2 border-l">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onTrash}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          )}
        </>
      )}

      {viewFilter === "archived" && (
        <>
          {onUnarchive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={onUnarchive}
            >
              <ArchiveRestore className="size-4" />
              Unarchive
            </Button>
          )}
          {onTrash && (
            <div className="pl-2 border-l">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onTrash}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          )}
        </>
      )}

      {viewFilter === "deleted" && (
        <>
          {onRestore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={onRestore}
            >
              <RotateCcw className="size-4" />
              Restore
            </Button>
          )}
          {onPermanentDelete && (
            <div className="pl-2 border-l">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onPermanentDelete}
              >
                <Trash2 className="size-4" />
                Delete Forever
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useState } from "react";
import {
  Download,
  Trash2,
  FolderInput,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Tag,
  X,
  Loader2,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Checkbox,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { FileTag } from "@/app/actions/files/get-client-files";

// =============================================================================
// Types
// =============================================================================

interface BulkActionBarProps {
  selectedCount: number;
  downloadableCount: number;
  onClearSelection: () => void;
  onDownloadSelected: () => void;
  onDeleteSelected: () => void;
  onSetDirection: (direction: "from_client" | "to_client" | "internal") => void;
  onSetProject: (projectId: string | null) => void;
  onAddTags: (tagIds: string[]) => void;
  projects: Array<{ id: string; name: string }>;
  availableTags: FileTag[];
  isDownloading?: boolean;
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function BulkActionBar({
  selectedCount,
  downloadableCount,
  onClearSelection,
  onDownloadSelected,
  onDeleteSelected,
  onSetDirection,
  onSetProject,
  onAddTags,
  projects,
  availableTags,
  isDownloading = false,
  className,
}: BulkActionBarProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleApplyTags = () => {
    if (selectedTags.length > 0) {
      onAddTags(selectedTags);
      setSelectedTags([]);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Floating bar at the bottom */}
      <div
        className={cn(
          "fixed bottom-6 z-50",
        "left-[calc(50%+var(--sidebar-width,16rem)/2)] -translate-x-1/2",
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

        {/* Download */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onDownloadSelected}
          disabled={downloadableCount === 0 || isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download
          {downloadableCount < selectedCount && (
            <span className="text-xs text-muted-foreground">
              ({downloadableCount})
            </span>
          )}
        </Button>

        {/* Direction */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <ArrowUpRight className="size-4" />
              Direction
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => onSetDirection("to_client")}>
              <ArrowUpRight className="size-4 mr-2" />
              Sent to Client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetDirection("from_client")}>
              <ArrowDownLeft className="size-4 mr-2" />
              Received from Client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetDirection("internal")}>
              <Lock className="size-4 mr-2" />
              Internal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Project */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <FolderInput className="size-4" />
              Project
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => onSetProject(null)}>
              No Project
            </DropdownMenuItem>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onSetProject(project.id)}
              >
                {project.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tags */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <Tag className="size-4" />
              Add Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="center">
            <div className="space-y-2">
              <p className="text-sm font-medium">Add tags to selected</p>
              <div className="space-y-1 max-h-48 overflow-auto">
                {availableTags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTags([...selectedTags, tag.id]);
                        } else {
                          setSelectedTags(
                            selectedTags.filter((id) => id !== tag.id)
                          );
                        }
                      }}
                    />
                    <span className="text-sm">{tag.label}</span>
                  </label>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={handleApplyTags}
                >
                  Apply Tags ({selectedTags.length})
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Delete */}
        <div className="pl-2 border-l">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} files?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected files from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDeleteSelected();
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@repo/utils";
import { Button } from "@/app/_components/ui/button";
import {
  FileText,
  Link as LinkIcon,
  Upload,
  Plus,
} from "lucide-react";
import type { KnowledgeType } from "../types";

export type QuickAction = "note" | "file" | "link";

interface QuickActionsBarProps {
  onAction: (action: QuickAction) => void;
  onFileDrop?: (files: FileList) => void;
  className?: string;
}

export function QuickActionsBar({
  onAction,
  onFileDrop,
  className,
}: QuickActionsBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileDrop?.(e.dataTransfer.files);
        e.dataTransfer.clearData();
      }
    },
    [onFileDrop]
  );

  return (
    <div
      className={cn(
        "relative rounded-lg border border-dashed transition-all duration-200",
        isDragging
          ? "border-primary bg-primary/5 py-8"
          : "border-border/60 bg-muted/30 py-3",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-medium text-primary">
            Drop files to upload
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => onAction("note")}
          >
            <Plus className="h-3.5 w-3.5" />
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Note</span>
          </Button>

          <div className="h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => onAction("file")}
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </Button>

          <div className="h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => onAction("link")}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Link</span>
          </Button>

          <span className="ml-4 text-xs text-muted-foreground/60 hidden md:block">
            or drag files here
          </span>
        </div>
      )}
    </div>
  );
}

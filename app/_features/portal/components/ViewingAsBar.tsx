"use client";

import { X, Eye } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { cn } from "@repo/utils";

interface ViewingAsBarProps {
  clientName: string;
  onExit: () => void;
  className?: string;
}

/**
 * ViewingAsBar - Impersonation banner for portal preview
 *
 * Shows "Viewing as: {Client Name}" with an exit button.
 * Inspired by Firm360's "View as Client" pattern.
 */
export function ViewingAsBar({ clientName, onExit, className }: ViewingAsBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2",
        "bg-primary/10 border-b border-primary/20",
        "rounded-t-lg",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm text-muted-foreground">Viewing as:</span>
        <span className="text-sm font-medium text-foreground truncate">
          {clientName}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onExit}
        className="shrink-0 h-7 px-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4 mr-1" />
        Exit
      </Button>
    </div>
  );
}

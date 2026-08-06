"use client";

import * as React from "react";
import type { SuggestedAction } from "../types/entity-context";
import { cn } from "@repo/utils";

interface SuggestedActionChipsProps {
  actions: SuggestedAction[];
  onActionClick: (action: SuggestedAction) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Suggested action chips shown below Salt's response.
 * Clicking a chip auto-submits the associated prompt.
 */
export function SuggestedActionChips({
  actions,
  onActionClick,
  disabled = false,
  className,
}: SuggestedActionChipsProps) {
  if (actions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onActionClick(action)}
          disabled={disabled}
          className="rounded-full border border-border/55 bg-muted/35 px-3 py-1.5 text-left text-xs leading-snug text-foreground transition hover:border-border hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

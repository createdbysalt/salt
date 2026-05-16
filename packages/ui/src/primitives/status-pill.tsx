"use client";

import * as React from "react";
import { cn } from "@repo/utils";

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The color for the status indicator dot */
  color: string;
  /** Text label for the status */
  label: string;
  /** Show outline-only dot instead of filled */
  outline?: boolean;
}

/**
 * StatusPill - A badge with a colored status indicator dot.
 *
 * v2 design system pattern: mono font, sharp corners, color dot.
 * Use for relationship types, status indicators, entity counts.
 */
function StatusPill({
  color,
  label,
  outline = false,
  className,
  ...props
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-foreground/5 text-foreground border border-border font-mono uppercase tracking-wider",
        className
      )}
      {...props}
    >
      <span
        className="size-1.5 rounded-full shrink-0"
        style={
          outline
            ? { border: `1.5px solid ${color}`, backgroundColor: "transparent" }
            : { backgroundColor: color }
        }
      />
      {label}
    </span>
  );
}

export interface EntityChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The color for the entity indicator */
  color: string;
  /** Text label for the entity */
  label: string;
  /** Optional count to display */
  count?: number;
  /** Show outline-only indicator instead of filled */
  outline?: boolean;
}

/**
 * EntityChip - A clickable badge for entity types with count.
 *
 * v2 design system pattern: interactive entity filter/tag.
 * Use for relationship type filters, entity groupings.
 */
function EntityChip({
  color,
  label,
  count,
  outline = false,
  className,
  ...props
}: EntityChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-foreground border border-border bg-card hover:bg-muted transition-colors",
        className
      )}
      {...props}
    >
      <span
        className="size-2 shrink-0"
        style={
          outline
            ? { border: `1.5px solid ${color}`, backgroundColor: "transparent" }
            : { backgroundColor: color }
        }
      />
      {label}
      {count !== undefined && (
        <span className="font-mono text-[10px] text-muted-foreground ml-1">
          {count}
        </span>
      )}
    </button>
  );
}

export { StatusPill, EntityChip };

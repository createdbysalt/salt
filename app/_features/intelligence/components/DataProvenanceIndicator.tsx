"use client";

/**
 * DataProvenanceIndicator Component
 *
 * Anti-Hallucination Pattern: Shows explicitly where data comes from.
 * Research backing: Linear, Stripe, HubSpot all use data provenance indicators.
 *
 * Usage:
 * - Inline: Small text showing source (e.g., "From: invoices • 2h ago")
 * - Tooltip: Hover for full computation details
 * - Expandable: Click for full data source sheet
 */

import * as React from "react";
import { Database, Clock, HelpCircle, ChevronDown } from "lucide-react";
import { cn } from "@repo/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@repo/ui";

import type { DataSource } from "../types/ambient-intelligence";

// ============================================================================
// Time Formatting
// ============================================================================

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFreshness(date: Date): "fresh" | "recent" | "stale" {
  const hours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  if (hours < 1) return "fresh";
  if (hours < 24) return "recent";
  return "stale";
}

// ============================================================================
// Inline Provenance (Smallest - for tight spaces)
// ============================================================================

interface InlineProvenanceProps {
  dataSource: DataSource;
  className?: string;
}

export function InlineProvenance({ dataSource, className }: InlineProvenanceProps) {
  const freshness = formatFreshness(new Date(dataSource.computedAt));
  const timeAgo = formatTimeAgo(new Date(dataSource.computedAt));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] text-muted-foreground cursor-help",
            className
          )}
        >
          <Database className="h-2.5 w-2.5" />
          <span className="font-mono">{dataSource.table.split(",")[0].trim()}</span>
          <span>•</span>
          <span
            className={cn(
              freshness === "fresh" && "text-success",
              freshness === "stale" && "text-warning"
            )}
          >
            {timeAgo}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1.5">
          <div className="font-medium text-xs">Data Source</div>
          <div className="text-[11px] space-y-1">
            <div className="flex items-center gap-1.5">
              <Database className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono">{dataSource.table}</span>
            </div>
            <div className="bg-muted/50 rounded px-1.5 py-1 font-mono text-[10px] text-muted-foreground">
              {dataSource.computation}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Computed {timeAgo}</span>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Compact Provenance (For card footers)
// ============================================================================

interface CompactProvenanceProps {
  dataSource: DataSource;
  className?: string;
  showTable?: boolean;
}

export function CompactProvenance({
  dataSource,
  className,
  showTable = true,
}: CompactProvenanceProps) {
  const freshness = formatFreshness(new Date(dataSource.computedAt));
  const timeAgo = formatTimeAgo(new Date(dataSource.computedAt));

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-[11px] text-muted-foreground",
        className
      )}
    >
      {showTable && (
        <>
          <Database className="h-3 w-3" />
          <span className="font-mono">{dataSource.table.split(",")[0].trim()}</span>
          <span className="text-border">|</span>
        </>
      )}
      <Clock className="h-3 w-3" />
      <span
        className={cn(
          freshness === "fresh" && "text-success",
          freshness === "stale" && "text-warning"
        )}
      >
        {timeAgo}
      </span>
    </div>
  );
}

// ============================================================================
// Expandable Provenance (For detail views)
// ============================================================================

interface ExpandableProvenanceProps {
  dataSource: DataSource;
  className?: string;
  defaultOpen?: boolean;
}

export function ExpandableProvenance({
  dataSource,
  className,
  defaultOpen = false,
}: ExpandableProvenanceProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const timeAgo = formatTimeAgo(new Date(dataSource.computedAt));
  const freshness = formatFreshness(new Date(dataSource.computedAt));

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Database className="h-3.5 w-3.5" />
        <span className="font-medium">Data Source</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 ml-auto transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="pt-2">
          <div className="space-y-2 text-xs border-l-2 border-muted pl-3 ml-1.5">
            {/* Table */}
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground w-16 shrink-0">Table:</span>
              <span className="font-mono text-foreground">{dataSource.table}</span>
            </div>

            {/* Computation */}
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground w-16 shrink-0">Query:</span>
              <code className="bg-muted/50 rounded px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground break-all">
                {dataSource.computation}
              </code>
            </div>

            {/* Time */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 shrink-0">Updated:</span>
              <span
                className={cn(
                  "font-medium",
                  freshness === "fresh" && "text-success",
                  freshness === "recent" && "text-foreground",
                  freshness === "stale" && "text-warning"
                )}
              >
                {timeAgo}
              </span>
            </div>

            {/* Entity IDs (if present) */}
            {dataSource.entityIds && dataSource.entityIds.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-16 shrink-0">Entities:</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {dataSource.entityIds.length} record{dataSource.entityIds.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Full Provenance Card (For deep-dive sheets)
// ============================================================================

interface ProvenanceCardProps {
  dataSource: DataSource;
  className?: string;
}

export function ProvenanceCard({ dataSource, className }: ProvenanceCardProps) {
  const timeAgo = formatTimeAgo(new Date(dataSource.computedAt));
  const freshness = formatFreshness(new Date(dataSource.computedAt));

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/30 p-3 space-y-3",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Database className="h-4 w-4 text-muted-foreground" />
        Data Source
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            This shows exactly where this metric comes from—no fabricated data.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-2 text-xs">
        {/* Table */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="w-20 shrink-0">Source table:</span>
          <span className="font-mono text-foreground">{dataSource.table}</span>
        </div>

        {/* Computation */}
        <div>
          <span className="text-muted-foreground">Computation:</span>
          <div className="mt-1 bg-background rounded-md p-2 font-mono text-[11px] text-muted-foreground border">
            {dataSource.computation}
          </div>
        </div>

        {/* Freshness */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last computed</span>
          </div>
          <span
            className={cn(
              "font-medium",
              freshness === "fresh" && "text-success",
              freshness === "recent" && "text-foreground",
              freshness === "stale" && "text-warning"
            )}
          >
            {timeAgo}
            {freshness === "stale" && (
              <span className="text-warning ml-1">(may be outdated)</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type {
  InlineProvenanceProps,
  CompactProvenanceProps,
  ExpandableProvenanceProps,
  ProvenanceCardProps,
};

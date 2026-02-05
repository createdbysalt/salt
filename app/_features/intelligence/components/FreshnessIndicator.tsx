"use client";

/**
 * FreshnessIndicator Component
 *
 * Shows when data was last updated with visual freshness status.
 * Research backing: Users want to know data is current, not stale.
 *
 * Freshness levels:
 * - Fresh: < 1 hour (green dot)
 * - Recent: < 24 hours (no indicator)
 * - Stale: > 24 hours (warning indicator)
 */

import * as React from "react";
import { Clock, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@repo/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Button,
} from "@repo/ui";

// ============================================================================
// Types
// ============================================================================

export type FreshnessLevel = "fresh" | "recent" | "stale" | "unknown";

interface FreshnessIndicatorProps {
  /** When the data was last computed/updated */
  computedAt: Date | string;
  /** Callback when refresh is requested */
  onRefresh?: () => void;
  /** Is refresh in progress */
  isRefreshing?: boolean;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Variant for different display contexts */
  variant?: "inline" | "badge" | "detailed";
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getFreshnessLevel(date: Date): FreshnessLevel {
  const hours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  if (hours < 1) return "fresh";
  if (hours < 24) return "recent";
  return "stale";
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const freshnessConfig: Record<FreshnessLevel, {
  label: string;
  description: string;
  dotColor: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  fresh: {
    label: "Fresh",
    description: "Data is up to date",
    dotColor: "bg-success",
    textColor: "text-success",
    icon: CheckCircle2,
  },
  recent: {
    label: "Recent",
    description: "Data updated within 24 hours",
    dotColor: "bg-muted-foreground",
    textColor: "text-muted-foreground",
    icon: Clock,
  },
  stale: {
    label: "Stale",
    description: "Data may be outdated",
    dotColor: "bg-warning",
    textColor: "text-warning",
    icon: AlertCircle,
  },
  unknown: {
    label: "Unknown",
    description: "Update time unknown",
    dotColor: "bg-muted",
    textColor: "text-muted-foreground",
    icon: Clock,
  },
};

// ============================================================================
// Inline Variant (Smallest)
// ============================================================================

function InlineFreshness({
  date,
  level,
  className,
}: {
  date: Date;
  level: FreshnessLevel;
  className?: string;
}) {
  const config = freshnessConfig[level];
  const timeAgo = formatTimeAgo(date);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] cursor-help",
            config.textColor,
            className
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
          {timeAgo}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="space-y-1">
          <div className="font-medium">{config.label}</div>
          <div className="text-muted-foreground">{formatFullDate(date)}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Badge Variant (Medium)
// ============================================================================

function BadgeFreshness({
  date,
  level,
  onRefresh,
  isRefreshing,
  showRefresh,
  className,
}: {
  date: Date;
  level: FreshnessLevel;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showRefresh?: boolean;
  className?: string;
}) {
  const config = freshnessConfig[level];
  const timeAgo = formatTimeAgo(date);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
        level === "stale" ? "bg-warning/10" : "bg-muted/50",
        config.textColor,
        className
      )}
    >
      <Clock className="h-3 w-3" />
      <span>Updated {timeAgo}</span>
      {showRefresh && onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 ml-1"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn("h-3 w-3", isRefreshing && "animate-spin")}
          />
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Detailed Variant (Largest)
// ============================================================================

function DetailedFreshness({
  date,
  level,
  onRefresh,
  isRefreshing,
  showRefresh,
  className,
}: {
  date: Date;
  level: FreshnessLevel;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showRefresh?: boolean;
  className?: string;
}) {
  const config = freshnessConfig[level];
  const Icon = config.icon;
  const timeAgo = formatTimeAgo(date);

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 rounded-md border",
        level === "stale" ? "border-warning/30 bg-warning/5" : "bg-muted/30",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", config.textColor)} />
        <div className="text-xs">
          <div className={cn("font-medium", config.textColor)}>
            {config.label}
          </div>
          <div className="text-muted-foreground">
            Last updated {timeAgo}
          </div>
        </div>
      </div>
      {showRefresh && onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-7 text-xs"
        >
          <RefreshCw
            className={cn("h-3 w-3 mr-1.5", isRefreshing && "animate-spin")}
          />
          Refresh
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FreshnessIndicator({
  computedAt,
  onRefresh,
  isRefreshing = false,
  showRefresh = false,
  variant = "inline",
  className,
}: FreshnessIndicatorProps) {
  const date = typeof computedAt === "string" ? new Date(computedAt) : computedAt;
  const level = getFreshnessLevel(date);

  switch (variant) {
    case "inline":
      return <InlineFreshness date={date} level={level} className={className} />;
    case "badge":
      return (
        <BadgeFreshness
          date={date}
          level={level}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          showRefresh={showRefresh}
          className={className}
        />
      );
    case "detailed":
      return (
        <DetailedFreshness
          date={date}
          level={level}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          showRefresh={showRefresh}
          className={className}
        />
      );
    default:
      return <InlineFreshness date={date} level={level} className={className} />;
  }
}

// ============================================================================
// Exports
// ============================================================================

export type { FreshnessIndicatorProps };
export { getFreshnessLevel, formatTimeAgo, formatFullDate };

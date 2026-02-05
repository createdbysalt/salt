"use client";

/**
 * InsightSection Component
 *
 * Container for grouping related insights with a header and optional view-all link.
 * Follows cognitive load guidelines: max 3-5 items per section.
 */

import * as React from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { cn } from "@repo/utils";
import { Button, Skeleton } from "@repo/ui";

// ============================================================================
// Types
// ============================================================================

interface InsightSectionProps {
  /** Section title */
  title: string;
  /** Icon name from lucide-react */
  icon?: string;
  /** Optional "View all" link */
  viewAllHref?: string;
  /** Content to render */
  children: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Number of skeleton items to show when loading */
  skeletonCount?: number;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Icon Resolver
// ============================================================================

function getIcon(iconName: string): React.ComponentType<{ className?: string }> | null {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || null;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function InsightSkeleton() {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-1.5 w-full" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function InsightSection({
  title,
  icon,
  viewAllHref,
  children,
  loading = false,
  skeletonCount = 2,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: InsightSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const Icon = icon ? getIcon(icon) : null;
  const ChevronIcon = LucideIcons.ChevronDown;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
          className={cn(
            "flex items-center gap-2 text-sm font-medium text-muted-foreground",
            collapsible && "cursor-pointer hover:text-foreground transition-colors"
          )}
          disabled={!collapsible}
        >
          {Icon && <Icon className="h-4 w-4" />}
          <span>{title}</span>
          {collapsible && (
            <ChevronIcon
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                isCollapsed && "-rotate-90"
              )}
            />
          )}
        </button>

        {viewAllHref && !isCollapsed && (
          <Button variant="ghost" size="sm" asChild className="h-auto py-0 px-1 text-xs">
            <Link href={viewAllHref}>View all</Link>
          </Button>
        )}
      </div>

      {/* Section Content */}
      {!isCollapsed && (
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: skeletonCount }).map((_, i) => (
              <InsightSkeleton key={i} />
            ))
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Empty State for Sections
// ============================================================================

interface InsightEmptyStateProps {
  message?: string;
  icon?: string;
}

export function InsightEmptyState({
  message = "No insights available",
  icon = "CheckCircle",
}: InsightEmptyStateProps) {
  const Icon = getIcon(icon);

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground/50 mb-2" />}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

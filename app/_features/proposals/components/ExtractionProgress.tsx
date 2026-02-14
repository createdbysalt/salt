"use client";

/**
 * ExtractionProgress Component
 *
 * Shows progress of AI extraction process with status badges per category.
 * Provides visual feedback during the extraction process.
 */

import * as React from "react";
import {
  AlertCircle,
  Target,
  AlertTriangle,
  User,
  Clock,
  DollarSign,
  MessageSquareQuote,
  XCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Progress,
  Skeleton,
} from "@repo/ui";

// ============================================================================
// Types
// ============================================================================

export type ExtractionStatus = "pending" | "in_progress" | "complete" | "error";

export interface CategoryProgress {
  status: ExtractionStatus;
  count?: number;
  error?: string;
}

export interface ExtractionProgressState {
  problems: CategoryProgress;
  goals: CategoryProgress;
  objections: CategoryProgress;
  decisionMakers: CategoryProgress;
  antiGoals: CategoryProgress;
  quotes: CategoryProgress;
  timeline: CategoryProgress;
  budget: CategoryProgress;
}

interface ExtractionProgressProps {
  /** Progress state for each category */
  progress: Partial<ExtractionProgressState>;
  /** Overall progress percentage (0-100) */
  overallProgress?: number;
  /** Is extraction currently running */
  isExtracting?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Category Config
// ============================================================================

const categories: Array<{
  key: keyof ExtractionProgressState;
  icon: React.ElementType;
  label: string;
}> = [
  { key: "problems", icon: AlertCircle, label: "Problems" },
  { key: "goals", icon: Target, label: "Goals" },
  { key: "objections", icon: AlertTriangle, label: "Objections" },
  { key: "decisionMakers", icon: User, label: "Decision Makers" },
  { key: "antiGoals", icon: XCircle, label: "Anti-Goals" },
  { key: "quotes", icon: MessageSquareQuote, label: "Quotes" },
  { key: "timeline", icon: Clock, label: "Timeline" },
  { key: "budget", icon: DollarSign, label: "Budget" },
];

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status, count }: { status: ExtractionStatus; count?: number }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
          Pending
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Extracting
        </Badge>
      );
    case "complete":
      return (
        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          {count !== undefined ? `${count} found` : "Done"}
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return null;
  }
}

// ============================================================================
// Category Row Component
// ============================================================================

function CategoryRow({
  icon: Icon,
  label,
  status = "pending",
  count,
  error,
}: {
  icon: React.ElementType;
  label: string;
  status?: ExtractionStatus;
  count?: number;
  error?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
        status === "in_progress" && "bg-primary/5",
        status === "complete" && "bg-success/5",
        status === "error" && "bg-destructive/5"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0",
          status === "pending" && "text-muted-foreground",
          status === "in_progress" && "text-primary",
          status === "complete" && "text-success",
          status === "error" && "text-destructive"
        )}
      >
        {status === "in_progress" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          "flex-1 text-sm",
          status === "pending" && "text-muted-foreground",
          status !== "pending" && "text-foreground font-medium"
        )}
      >
        {label}
      </span>

      {/* Status Badge */}
      <StatusBadge status={status} count={count} />
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ExtractionProgressSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ExtractionProgress({
  progress,
  overallProgress,
  isExtracting = false,
  className,
}: ExtractionProgressProps) {
  // Calculate overall progress if not provided
  const calculatedProgress =
    overallProgress ??
    Math.round(
      (categories.filter((c) => progress[c.key]?.status === "complete").length /
        categories.length) *
        100
    );

  const completedCount = categories.filter(
    (c) => progress[c.key]?.status === "complete"
  ).length;

  const totalExtracted = categories.reduce((sum, c) => {
    return sum + (progress[c.key]?.count || 0);
  }, 0);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {isExtracting && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            Extraction Progress
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{completedCount}/{categories.length} complete</span>
            {totalExtracted > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalExtracted} items
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Overall Progress Bar */}
        <div className="space-y-1">
          <Progress
            value={calculatedProgress}
            className="h-2 [&>[data-slot=progress-indicator]]:bg-primary"
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {calculatedProgress}% complete
          </p>
        </div>

        {/* Category Rows */}
        <div className="space-y-1">
          {categories.map((category) => {
            const categoryProgress = progress[category.key];
            return (
              <CategoryRow
                key={category.key}
                icon={category.icon}
                label={category.label}
                status={categoryProgress?.status}
                count={categoryProgress?.count}
                error={categoryProgress?.error}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper: Create Initial Progress State
// ============================================================================

export function createInitialProgress(): ExtractionProgressState {
  return {
    problems: { status: "pending" },
    goals: { status: "pending" },
    objections: { status: "pending" },
    decisionMakers: { status: "pending" },
    antiGoals: { status: "pending" },
    quotes: { status: "pending" },
    timeline: { status: "pending" },
    budget: { status: "pending" },
  };
}

// ============================================================================
// Helper: Update Progress From Extraction Result
// ============================================================================

export function progressFromExtraction(
  extraction: {
    problems?: unknown[];
    goals?: unknown[];
    objections?: unknown[];
    decisionMakers?: unknown[];
    antiGoals?: unknown[];
    quotes?: unknown[];
    timeline?: unknown;
    budget?: unknown;
  } | null
): Partial<ExtractionProgressState> {
  if (!extraction) return {};

  return {
    problems: {
      status: "complete",
      count: extraction.problems?.length || 0,
    },
    goals: {
      status: "complete",
      count: extraction.goals?.length || 0,
    },
    objections: {
      status: "complete",
      count: extraction.objections?.length || 0,
    },
    decisionMakers: {
      status: "complete",
      count: extraction.decisionMakers?.length || 0,
    },
    antiGoals: {
      status: "complete",
      count: extraction.antiGoals?.length || 0,
    },
    quotes: {
      status: "complete",
      count: extraction.quotes?.length || 0,
    },
    timeline: {
      status: "complete",
      count: extraction.timeline ? 1 : 0,
    },
    budget: {
      status: "complete",
      count: extraction.budget ? 1 : 0,
    },
  };
}

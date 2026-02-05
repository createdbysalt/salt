"use client";

/**
 * AlertCard Component
 *
 * Displays alert insights with urgency indicators and action buttons.
 * Implements the Three-Layer Interaction Model for alerts.
 */

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  ExternalLink,
  Database,
  Clock,
  User,
  FileText,
  Calendar,
  FolderOpen,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Card,
  CardContent,
  Badge,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Separator,
} from "@repo/ui";

import type {
  AlertInsight,
  InsightUrgency,
} from "../types/ambient-intelligence";

// ============================================================================
// Urgency & Sentiment Styling
// ============================================================================

const urgencyStyles: Record<InsightUrgency, {
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  border: string;
}> = {
  critical: {
    icon: AlertCircle,
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    border: "border-l-destructive",
  },
  high: {
    icon: AlertTriangle,
    badge: "bg-warning/10 text-warning border-warning/20",
    border: "border-l-warning",
  },
  medium: {
    icon: Info,
    badge: "bg-primary/10 text-primary border-primary/20",
    border: "border-l-primary",
  },
  low: {
    icon: CheckCircle,
    badge: "bg-muted text-muted-foreground border-border",
    border: "border-l-muted-foreground",
  },
};

const entityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  client: User,
  invoice: FileText,
  meeting: Calendar,
  project: FolderOpen,
};

// ============================================================================
// Helper Functions
// ============================================================================

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================================================
// Props
// ============================================================================

interface AlertCardProps {
  alert: AlertInsight;
  className?: string;
  compact?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function AlertCard({ alert, className, compact = false }: AlertCardProps) {
  const urgency = alert.action?.urgency || "medium";
  const urgencyStyle = urgencyStyles[urgency];
  const UrgencyIcon = urgencyStyle.icon;
  const EntityIcon = entityIcons[alert.alert.entityType] || Info;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={alert.action?.href || "#"}
            className={cn(
              "flex items-start gap-2 p-2 rounded-md transition-colors",
              "hover:bg-muted/50 cursor-pointer",
              className
            )}
          >
            <UrgencyIcon className={cn("h-4 w-4 shrink-0 mt-0.5",
              urgency === "critical" ? "text-destructive" :
              urgency === "high" ? "text-warning" :
              urgency === "medium" ? "text-primary" :
              "text-muted-foreground"
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {alert.alert.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {alert.alert.description}
              </p>
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="font-medium">{alert.meaning.plainEnglish}</p>
          <p className="text-xs text-muted-foreground mt-1">{alert.meaning.whyItMatters}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Sheet>
      {/* LAYER 1: GLANCE - Visible Alert Card */}
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Card
              className={cn(
                "cursor-pointer transition-all duration-150",
                "hover:bg-muted/50 active:scale-[0.98]",
                "border-l-2",
                urgencyStyle.border,
                className
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "shrink-0 rounded-full p-1.5",
                      urgency === "critical" ? "bg-destructive/10" :
                      urgency === "high" ? "bg-warning/10" :
                      urgency === "medium" ? "bg-primary/10" :
                      "bg-muted"
                    )}
                  >
                    <UrgencyIcon className={cn("h-4 w-4",
                      urgency === "critical" ? "text-destructive" :
                      urgency === "high" ? "text-warning" :
                      urgency === "medium" ? "text-primary" :
                      "text-muted-foreground"
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {alert.alert.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {alert.alert.description}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0", urgencyStyle.badge)}>
                        {urgency}
                      </Badge>
                    </div>

                    {/* Action Link */}
                    {alert.action && (
                      <div className="mt-2">
                        <span className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                          {alert.action.label}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </SheetTrigger>
        </TooltipTrigger>

        {/* LAYER 2: EXPLAIN - Tooltip */}
        <TooltipContent side="left" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{alert.meaning.plainEnglish}</p>
            <p className="text-muted-foreground text-[11px]">{alert.meaning.whyItMatters}</p>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* LAYER 3: DEEP-DIVE - Sheet */}
      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "shrink-0 rounded-full p-2",
                urgency === "critical" ? "bg-destructive/10" :
                urgency === "high" ? "bg-warning/10" :
                urgency === "medium" ? "bg-primary/10" :
                "bg-muted"
              )}
            >
              <UrgencyIcon className={cn("h-5 w-5",
                urgency === "critical" ? "text-destructive" :
                urgency === "high" ? "text-warning" :
                urgency === "medium" ? "text-primary" :
                "text-muted-foreground"
              )} />
            </div>
            <div>
              <SheetTitle>{alert.alert.title}</SheetTitle>
              <SheetDescription>{alert.alert.description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Entity Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <EntityIcon className="h-8 w-8 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{alert.alert.entityName}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {alert.alert.entityType}
              </div>
            </div>
          </div>

          {/* Urgency Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Urgency Level</span>
            <Badge variant="outline" className={urgencyStyle.badge}>
              {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
            </Badge>
          </div>

          <Separator />

          {/* Meaning */}
          <div>
            <div className="text-sm font-medium mb-2">What This Means</div>
            <p className="text-sm text-muted-foreground">{alert.meaning.plainEnglish}</p>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Why It Matters</div>
            <p className="text-sm text-muted-foreground">{alert.meaning.whyItMatters}</p>
          </div>

          <Separator />

          {/* Data Source */}
          <div>
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Source
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Database className="h-3 w-3" />
                <span className="font-mono">{alert.alert.dataSource.table}</span>
              </div>
              <div className="bg-muted/50 rounded-md p-2 font-mono text-[11px] text-muted-foreground">
                {alert.alert.dataSource.computation}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Computed {getTimeAgo(new Date(alert.alert.dataSource.computedAt))}</span>
              </div>
            </div>
          </div>

          {/* Action */}
          {alert.action && alert.action.href && (
            <div className="pt-4">
              <Button asChild className="w-full">
                <Link href={alert.action.href}>
                  {alert.action.label}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

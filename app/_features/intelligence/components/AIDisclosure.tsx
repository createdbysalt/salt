"use client";

/**
 * AIDisclosure Components
 *
 * Research-backed patterns for labeling AI-generated content.
 * Key finding: "Disclosures should label the action, not just the feature"
 *
 * Usage:
 * - AIBadge: Small inline badge for AI content
 * - AIInsightCard: Full card for AI-generated insights
 * - AIDisclosureText: Explanatory text for AI attribution
 *
 * Sources:
 * - ShapeofAI Disclosure Patterns
 * - MIT Sloan AI Disclosures & Trust
 * - KPMG Trust in AI 2025
 */

import * as React from "react";
import {
  Sparkles,
  Brain,
  Info,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Button,
} from "@repo/ui";
import Link from "next/link";

import type { DataSource } from "../types/ambient-intelligence";
import { CompactProvenance } from "./DataProvenanceIndicator";

// ============================================================================
// Confidence Types
// ============================================================================

export type AIConfidence = "high" | "medium" | "low";

const confidenceStyles: Record<AIConfidence, {
  label: string;
  color: string;
  description: string;
}> = {
  high: {
    label: "High confidence",
    color: "text-success",
    description: "Based on substantial historical data",
  },
  medium: {
    label: "Medium confidence",
    color: "text-warning",
    description: "Based on limited or recent data",
  },
  low: {
    label: "Low confidence",
    color: "text-muted-foreground",
    description: "Preliminary insight, may change with more data",
  },
};

// ============================================================================
// AI Badge (Inline disclosure)
// ============================================================================

interface AIBadgeProps {
  /** What action the AI performed */
  action?: "summarized" | "analyzed" | "generated" | "suggested" | "predicted";
  /** Show the sparkle icon */
  showIcon?: boolean;
  /** Additional class names */
  className?: string;
  /** Tooltip with more details */
  tooltip?: string;
}

const actionLabels: Record<NonNullable<AIBadgeProps["action"]>, string> = {
  summarized: "Summarized with AI",
  analyzed: "Analyzed with AI",
  generated: "AI-generated",
  suggested: "AI suggestion",
  predicted: "AI prediction",
};

export function AIBadge({
  action = "generated",
  showIcon = true,
  className,
  tooltip,
}: AIBadgeProps) {
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-normal gap-1 px-1.5 py-0",
        "border-primary/20 bg-primary/5 text-primary",
        className
      )}
    >
      {showIcon && <Sparkles className="h-2.5 w-2.5" />}
      {actionLabels[action]}
    </Badge>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}

// ============================================================================
// AI Disclosure Text (For explanations)
// ============================================================================

interface AIDisclosureTextProps {
  /** Data sources that informed the AI */
  sources?: string[];
  /** Additional context */
  context?: string;
  /** Compact mode */
  compact?: boolean;
  className?: string;
}

export function AIDisclosureText({
  sources,
  context,
  compact = false,
  className,
}: AIDisclosureTextProps) {
  if (compact) {
    return (
      <span className={cn("text-[10px] text-muted-foreground", className)}>
        <Sparkles className="h-2.5 w-2.5 inline mr-1" />
        Based on your data
        {sources && sources.length > 0 && (
          <span className="font-mono">: {sources.slice(0, 2).join(", ")}</span>
        )}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/30",
        className
      )}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
      <div className="space-y-0.5">
        <span className="font-medium text-foreground">Based on your data</span>
        {sources && sources.length > 0 && (
          <p className="text-[11px]">
            Sources: <span className="font-mono">{sources.join(", ")}</span>
          </p>
        )}
        {context && <p className="text-[11px]">{context}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// Confidence Indicator
// ============================================================================

interface ConfidenceIndicatorProps {
  confidence: AIConfidence;
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceIndicator({
  confidence,
  showLabel = true,
  className,
}: ConfidenceIndicatorProps) {
  const style = confidenceStyles[confidence];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 text-xs",
            style.color,
            className
          )}
        >
          {confidence === "high" && <CheckCircle className="h-3 w-3" />}
          {confidence === "medium" && <AlertCircle className="h-3 w-3" />}
          {confidence === "low" && <HelpCircle className="h-3 w-3" />}
          {showLabel && <span>{style.label}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {style.description}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// AI Insight Card (Full component for AI-generated insights)
// ============================================================================

interface AIInsightCardProps {
  /** The AI-generated insight text */
  insight: string;
  /** What the AI did to generate this */
  action?: AIBadgeProps["action"];
  /** Confidence level */
  confidence?: AIConfidence;
  /** Data source for anti-hallucination */
  dataSource?: DataSource;
  /** Supporting data points */
  supportingData?: Array<{
    label: string;
    value: string;
  }>;
  /** Optional action to take */
  actionButton?: {
    label: string;
    href: string;
  };
  /** Show in compact mode */
  compact?: boolean;
  className?: string;
}

export function AIInsightCard({
  insight,
  action = "analyzed",
  confidence,
  dataSource,
  supportingData,
  actionButton,
  compact = false,
  className,
}: AIInsightCardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 p-2 rounded-md border bg-card",
          className
        )}
      >
        <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">{insight}</p>
          <div className="flex items-center gap-2 mt-1">
            <AIBadge action={action} showIcon={false} />
            {confidence && (
              <ConfidenceIndicator confidence={confidence} showLabel={false} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* AI Indicator Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/10">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">AI Insight</span>
        <AIBadge action={action} showIcon={false} className="ml-auto" />
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Main Insight */}
        <p className="text-sm text-foreground leading-relaxed">{insight}</p>

        {/* Supporting Data */}
        {supportingData && supportingData.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {supportingData.map((item, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1.5 text-xs bg-muted/50 rounded px-2 py-1"
              >
                <span className="text-muted-foreground">{item.label}:</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Confidence & Provenance */}
        <div className="flex items-center justify-between pt-2 border-t">
          {confidence && <ConfidenceIndicator confidence={confidence} />}
          {dataSource && (
            <CompactProvenance dataSource={dataSource} showTable={false} />
          )}
        </div>

        {/* Action Button */}
        {actionButton && (
          <Button asChild variant="outline" size="sm" className="w-full mt-2">
            <Link href={actionButton.href}>
              {actionButton.label}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// AI Section Header (For grouping AI content)
// ============================================================================

interface AISectionHeaderProps {
  title?: string;
  description?: string;
  className?: string;
}

export function AISectionHeader({
  title = "AI Insights",
  description = "Generated from your data",
  className,
}: AISectionHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2 mb-3", className)}>
      <div className="flex items-center gap-2 text-primary">
        <Brain className="h-4 w-4" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {description}. All insights are based on your actual data—we never
          fabricate numbers or make up information.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type {
  AIBadgeProps,
  AIDisclosureTextProps,
  ConfidenceIndicatorProps,
  AIInsightCardProps,
  AISectionHeaderProps,
};

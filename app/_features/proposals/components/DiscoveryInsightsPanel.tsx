"use client";

/**
 * DiscoveryInsightsPanel Component
 *
 * Displays all extracted proposal insights in categorized, collapsible sections.
 * Designed to be placed alongside the proposal editor.
 *
 * Features:
 * - Collapsible sections per insight type
 * - "Copy All" per section
 * - Source attribution for each insight
 * - Confidence badges
 * - Loading/empty states
 */

import * as React from "react";
import { useState, useTransition } from "react";
import {
  AlertCircle,
  Target,
  AlertTriangle,
  User,
  Clock,
  DollarSign,
  MessageSquareQuote,
  XCircle,
  ChevronDown,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Skeleton,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AIButton,
} from "@repo/ui";
import { EmptyState } from "@repo/patterns";

import { InsightCard, type InsightType } from "./InsightCard";
import type { ProposalExtractionResult } from "@/app/_features/intelligence/types/proposal-intelligence";

// ============================================================================
// Types
// ============================================================================

interface DiscoveryInsightsPanelProps {
  /** Extraction results */
  extraction: ProposalExtractionResult | null;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when extraction is requested */
  onExtract?: () => void;
  /** Callback when an insight is copied */
  onCopyInsight?: (type: InsightType, text: string) => void;
  /** Callback when all insights of a type are copied */
  onCopyAll?: (type: InsightType, texts: string[]) => void;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Section Config
// ============================================================================

const sections: Array<{
  key: keyof ProposalExtractionResult;
  type: InsightType;
  icon: React.ElementType;
  label: string;
  emptyText: string;
}> = [
  {
    key: "problems",
    type: "problem",
    icon: AlertCircle,
    label: "Problems & Pain Points",
    emptyText: "No problems identified",
  },
  {
    key: "goals",
    type: "goal",
    icon: Target,
    label: "Goals & Outcomes",
    emptyText: "No goals identified",
  },
  {
    key: "objections",
    type: "objection",
    icon: AlertTriangle,
    label: "Objections & Concerns",
    emptyText: "No objections identified",
  },
  {
    key: "decisionMakers",
    type: "decision_maker",
    icon: User,
    label: "Decision Makers",
    emptyText: "No decision makers identified",
  },
  {
    key: "antiGoals",
    type: "anti_goal",
    icon: XCircle,
    label: "Anti-Goals (What to Avoid)",
    emptyText: "No anti-goals identified",
  },
  {
    key: "quotes",
    type: "quote",
    icon: MessageSquareQuote,
    label: "Quotable Statements",
    emptyText: "No quotes extracted",
  },
];

// ============================================================================
// Section Component
// ============================================================================

function InsightSection({
  type,
  icon: Icon,
  label,
  items,
  emptyText,
  onCopyInsight,
  onCopyAll,
}: {
  type: InsightType;
  icon: React.ElementType;
  label: string;
  items: Array<{
    text: string;
    confidence: "high" | "medium" | "low";
    confidenceScore: number;
    source: {
      type: string;
      ref: string;
      label: string;
      quote?: string;
    };
    quote?: string;
    category?: string;
  }>;
  emptyText: string;
  onCopyInsight?: (text: string) => void;
  onCopyAll?: (texts: string[]) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = () => {
    const texts = items.map((item) => item.quote || item.text);
    navigator.clipboard.writeText(texts.join("\n\n"));
    setCopied(true);
    onCopyAll?.(texts);
    setTimeout(() => setCopied(false), 2000);
  };

  const highConfidenceCount = items.filter((i) => i.confidence === "high").length;

  return (
    <AccordionItem value={type} className="border-none">
      <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-lg hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
        <div className="flex items-center gap-2 flex-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{label}</span>
          <Badge variant="secondary" className="ml-auto mr-2 text-xs">
            {items.length}
          </Badge>
          {highConfidenceCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
              {highConfidenceCount} high
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-0 pt-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground px-3 py-2">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {/* Copy All button */}
            <div className="flex justify-end px-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAll}
                className="text-xs h-7"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy All
                  </>
                )}
              </Button>
            </div>

            {/* Insight cards */}
            {items.map((item, index) => (
              <InsightCard
                key={`${type}-${index}`}
                type={type}
                text={item.text}
                confidence={item.confidence}
                confidenceScore={item.confidenceScore}
                source={{
                  type: item.source.type as any,
                  ref: item.source.ref,
                  label: item.source.label,
                  quote: item.source.quote,
                }}
                quote={item.quote}
                category={item.category}
                onCopy={onCopyInsight}
              />
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

// ============================================================================
// Timeline/Budget Special Components
// ============================================================================

function TimelineBadge({
  timeline,
}: {
  timeline: ProposalExtractionResult["timeline"];
}) {
  if (!timeline) return null;

  const urgencyColors = {
    asap: "bg-destructive/10 text-destructive border-destructive/20",
    specific_date: "bg-primary/10 text-primary border-primary/20",
    quarter: "bg-warning/10 text-warning border-warning/20",
    flexible: "bg-muted text-muted-foreground border-border",
    unknown: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 border">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Timeline</span>
        <Badge variant="outline" className={cn("ml-auto text-[10px]", urgencyColors[timeline.urgency])}>
          {timeline.urgency.replace("_", " ").toUpperCase()}
        </Badge>
      </div>
      <p className="text-sm">{timeline.text}</p>
      {timeline.targetDate && (
        <p className="text-xs text-muted-foreground mt-1">
          Target: {timeline.targetDate}
        </p>
      )}
    </div>
  );
}

function BudgetBadge({
  budget,
}: {
  budget: ProposalExtractionResult["budget"];
}) {
  if (!budget) return null;

  const stanceColors = {
    stated: "bg-success/10 text-success border-success/20",
    implied: "bg-primary/10 text-primary border-primary/20",
    flexible: "bg-warning/10 text-warning border-warning/20",
    constrained: "bg-destructive/10 text-destructive border-destructive/20",
    unknown: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 border">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Budget</span>
        <Badge variant="outline" className={cn("ml-auto text-[10px]", stanceColors[budget.stance])}>
          {budget.stance.toUpperCase()}
        </Badge>
      </div>
      <p className="text-sm">{budget.text}</p>
      {budget.range && (budget.range.min || budget.range.max) && (
        <p className="text-xs text-muted-foreground mt-1">
          Range: {budget.range.min ? `${budget.range.currency}${budget.range.min.toLocaleString()}` : "?"}
          {" - "}
          {budget.range.max ? `${budget.range.currency}${budget.range.max.toLocaleString()}` : "?"}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function DiscoveryInsightsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DiscoveryInsightsPanel({
  extraction,
  isLoading = false,
  error = null,
  onExtract,
  onCopyInsight,
  onCopyAll,
  className,
}: DiscoveryInsightsPanelProps) {
  const [isPending, startTransition] = useTransition();

  const handleExtract = () => {
    if (onExtract) {
      startTransition(() => {
        onExtract();
      });
    }
  };

  // Calculate totals
  const totalInsights = extraction
    ? (extraction.problems?.length || 0) +
      (extraction.goals?.length || 0) +
      (extraction.objections?.length || 0) +
      (extraction.decisionMakers?.length || 0) +
      (extraction.antiGoals?.length || 0) +
      (extraction.quotes?.length || 0)
    : 0;

  const highConfidenceCount = extraction
    ? [
        ...(extraction.problems || []),
        ...(extraction.goals || []),
        ...(extraction.objections || []),
        ...(extraction.decisionMakers || []),
        ...(extraction.antiGoals || []),
        ...(extraction.quotes || []),
      ].filter((item) => item.confidence === "high").length
    : 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Discovery Insights</CardTitle>
          </div>
          {extraction && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {totalInsights} insights
              </Badge>
              {highConfidenceCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                  {highConfidenceCount} high confidence
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Loading State */}
        {(isLoading || isPending) && <DiscoveryInsightsSkeleton />}

        {/* Error State */}
        {error && !isLoading && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm text-destructive">{error}</p>
            {onExtract && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExtract}
                className="mt-3"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isPending && !error && !extraction && (
          <EmptyState
            icon={<Sparkles className="h-10 w-10" />}
            title="No insights yet"
            description="Extract insights from intake responses and discovery data."
            action={
              onExtract ? (
                <AIButton onClick={handleExtract} size="sm">
                  <Sparkles className="h-4 w-4" />
                  Extract Insights
                </AIButton>
              ) : undefined
            }
          />
        )}

        {/* Results */}
        {!isLoading && !isPending && !error && extraction && (
          <div className="space-y-4">
            {/* Timeline & Budget badges */}
            {(extraction.timeline || extraction.budget) && (
              <div className="grid gap-2">
                <TimelineBadge timeline={extraction.timeline} />
                <BudgetBadge budget={extraction.budget} />
              </div>
            )}

            {/* Collapsible sections */}
            <Accordion
              type="multiple"
              defaultValue={["problem", "goal"]}
              className="space-y-1"
            >
              {sections.map((section) => {
                const items = (extraction[section.key] as any[]) || [];
                return (
                  <InsightSection
                    key={section.key}
                    type={section.type}
                    icon={section.icon}
                    label={section.label}
                    items={items}
                    emptyText={section.emptyText}
                    onCopyInsight={(text) => onCopyInsight?.(section.type, text)}
                    onCopyAll={(texts) => onCopyAll?.(section.type, texts)}
                  />
                );
              })}
            </Accordion>

            {/* Metadata */}
            {extraction.metadata && (
              <div className="pt-2 border-t">
                <p className="text-[10px] text-muted-foreground">
                  Extracted {extraction.metadata.totalItems} items ·{" "}
                  {extraction.metadata.highConfidenceCount} high confidence ·{" "}
                  {new Date(extraction.metadata.extractedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Re-extract button */}
            {onExtract && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExtract}
                className="w-full"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Re-extract Insights
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

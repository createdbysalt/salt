"use client";

/**
 * InsightCard Component
 *
 * Displays an extracted insight with three-layer interaction:
 * 1. GLANCE (Always Visible): Insight text + confidence badge
 * 2. EXPLAIN (Tooltip on Hover): Source details + quote
 * 3. DEEP-DIVE (Sheet on Click): Full context + copy action
 *
 * Follows MetricWithExplanation pattern from intelligence feature.
 */

import * as React from "react";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Info,
  MessageSquareQuote,
  Copy,
  Check,
  ExternalLink,
  Lightbulb,
  Target,
  AlertTriangle,
  User,
  Clock,
  DollarSign,
  XCircle,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Separator,
} from "@repo/ui";

import type {
  ExtractionConfidence,
  SourceReference,
} from "@/app/_features/intelligence/types/proposal-intelligence";

// ============================================================================
// Types
// ============================================================================

export type InsightType =
  | "problem"
  | "goal"
  | "objection"
  | "decision_maker"
  | "timeline"
  | "budget"
  | "quote"
  | "anti_goal";

export interface InsightCardProps {
  /** Type of insight for styling/icon */
  type: InsightType;
  /** Main insight text */
  text: string;
  /** Confidence level */
  confidence: ExtractionConfidence;
  /** Numeric confidence score (0-1) */
  confidenceScore: number;
  /** Source reference */
  source: SourceReference;
  /** Exact quote from source */
  quote?: string;
  /** Optional category/subtype label */
  category?: string;
  /** Called when user clicks "Copy to Proposal" */
  onCopy?: (text: string) => void;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Styling Maps
// ============================================================================

const typeConfig: Record<
  InsightType,
  {
    icon: React.ElementType;
    label: string;
    color: string;
  }
> = {
  problem: {
    icon: AlertCircle,
    label: "Problem",
    color: "text-destructive",
  },
  goal: {
    icon: Target,
    label: "Goal",
    color: "text-success",
  },
  objection: {
    icon: AlertTriangle,
    label: "Objection",
    color: "text-warning",
  },
  decision_maker: {
    icon: User,
    label: "Decision Maker",
    color: "text-primary",
  },
  timeline: {
    icon: Clock,
    label: "Timeline",
    color: "text-primary",
  },
  budget: {
    icon: DollarSign,
    label: "Budget",
    color: "text-success",
  },
  quote: {
    icon: MessageSquareQuote,
    label: "Quote",
    color: "text-muted-foreground",
  },
  anti_goal: {
    icon: XCircle,
    label: "Anti-Goal",
    color: "text-destructive",
  },
};

const confidenceConfig: Record<
  ExtractionConfidence,
  {
    label: string;
    variant: "default" | "secondary" | "outline";
    className: string;
  }
> = {
  high: {
    label: "High",
    variant: "default",
    className: "bg-success/10 text-success border-success/20",
  },
  medium: {
    label: "Medium",
    variant: "secondary",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  low: {
    label: "Low",
    variant: "outline",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const sourceTypeLabels: Record<string, string> = {
  intake: "Intake Response",
  transcript: "Meeting Transcript",
  discovery: "Auto-Discovery",
  knowledge: "Knowledge Base",
  history: "Client History",
};

// ============================================================================
// Main Component
// ============================================================================

export function InsightCard({
  type,
  text,
  confidence,
  confidenceScore,
  source,
  quote,
  category,
  onCopy,
  className,
}: InsightCardProps) {
  const [copied, setCopied] = useState(false);

  const config = typeConfig[type];
  const confConfig = confidenceConfig[confidence];
  const Icon = config.icon;

  const handleCopy = () => {
    const textToCopy = quote || text;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    onCopy?.(textToCopy);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet>
      {/* LAYER 1: GLANCE - Always Visible */}
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Card
              className={cn(
                "cursor-pointer transition-all duration-150",
                "hover:bg-muted/50 active:scale-[0.98]",
                "border-transparent hover:border-border",
                className
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn("shrink-0 mt-0.5", config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header row with type + confidence */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {config.label}
                        {category && ` · ${category}`}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", confConfig.className)}>
                        {confConfig.label}
                      </Badge>
                      <Info className="h-3 w-3 text-muted-foreground/50 ml-auto shrink-0" />
                    </div>

                    {/* Main text */}
                    <p className="text-sm text-foreground line-clamp-2">
                      {text}
                    </p>

                    {/* Quote indicator */}
                    {quote && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <MessageSquareQuote className="h-3 w-3" />
                        <span className="truncate italic">&quot;{quote.slice(0, 50)}...&quot;</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </SheetTrigger>
        </TooltipTrigger>

        {/* LAYER 2: EXPLAIN - Tooltip on Hover */}
        <TooltipContent side="left" className="max-w-xs">
          <div className="space-y-1">
            <p className="text-xs font-medium">
              {sourceTypeLabels[source.type] || source.type}
            </p>
            <p className="text-xs text-muted-foreground">{source.label}</p>
            <p className="text-[10px] text-muted-foreground/70">
              {Math.round(confidenceScore * 100)}% confidence · Click for details
            </p>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* LAYER 3: DEEP-DIVE - Sheet on Click */}
      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.color)} />
            {config.label}
            {category && (
              <Badge variant="outline" className="ml-1 text-xs">
                {category}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Extracted insight with source attribution
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Main Insight Text */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Insight</div>
            <p className="text-base text-foreground">{text}</p>
          </div>

          {/* Exact Quote */}
          {quote && (
            <div className="bg-muted/30 rounded-lg p-4 border-l-2 border-primary/50">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Direct Quote
                </span>
              </div>
              <p className="text-sm italic text-foreground">&quot;{quote}&quot;</p>
            </div>
          )}

          {/* Confidence */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">Confidence</div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn("px-2 py-1", confConfig.className)}>
                {confConfig.label} ({Math.round(confidenceScore * 100)}%)
              </Badge>
              {confidence === "high" && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle className="h-3 w-3" />
                  Auto-accepted
                </span>
              )}
              {confidence === "medium" && (
                <span className="flex items-center gap-1 text-xs text-warning">
                  <Info className="h-3 w-3" />
                  Review recommended
                </span>
              )}
              {confidence === "low" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  Verify source
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Source Details */}
          <div>
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Source
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">
                  {sourceTypeLabels[source.type] || source.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {source.ref}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">Label:</span>
                <span>{source.label}</span>
              </div>
            </div>
          </div>

          {source.href && (
            <Button asChild variant="outline" className="w-full">
              <a href={source.href} target="_blank" rel="noopener noreferrer">
                View Source
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              className="flex-1"
              variant={copied ? "outline" : "default"}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Proposal
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

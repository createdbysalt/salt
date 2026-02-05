"use client";

/**
 * AmbientInsightRenderer Component
 *
 * Renders any AmbientInsight type using the appropriate component.
 * Acts as a factory/dispatcher for the intelligence system.
 */

import * as React from "react";
import * as LucideIcons from "lucide-react";
import type { AmbientInsight } from "../types/ambient-intelligence";
import { MetricWithExplanation } from "./MetricWithExplanation";
import { AlertCard } from "./AlertCard";

// ============================================================================
// Types
// ============================================================================

interface AmbientInsightRendererProps {
  insight: AmbientInsight;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// Icon Resolver
// ============================================================================

function getIconComponent(iconName?: string): React.ReactNode {
  if (!iconName) return null;
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = icons[iconName];
  return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
}

// ============================================================================
// Main Component
// ============================================================================

export function AmbientInsightRenderer({
  insight,
  compact = false,
  className,
}: AmbientInsightRendererProps) {
  switch (insight.category) {
    case "health":
      return (
        <MetricWithExplanation
          label={insight.metric.label}
          value={`${insight.metric.score}%`}
          rawValue={insight.metric.score}
          sentiment={insight.sentiment}
          dataSource={insight.metric.dataSource}
          meaning={insight.meaning}
          action={insight.action}
          healthScore={insight.metric.score}
          icon={getIconComponent("Heart")}
          className={className}
        />
      );

    case "trend":
      return (
        <MetricWithExplanation
          label={insight.metric.label}
          value={insight.metric.formattedValue}
          rawValue={insight.metric.value}
          unit={insight.metric.unit}
          sentiment={insight.sentiment}
          dataSource={insight.metric.dataSource}
          meaning={insight.meaning}
          action={insight.action}
          sparkline={
            insight.trend && insight.trend.sparklineData
              ? {
                  values: insight.trend.sparklineData,
                  direction: insight.trend.direction,
                  changePercent: insight.trend.changePercent,
                }
              : undefined
          }
          icon={getIconComponent("TrendingUp")}
          className={className}
        />
      );

    case "alert":
      return (
        <AlertCard
          alert={insight}
          compact={compact}
          className={className}
        />
      );

    case "opportunity":
      return (
        <MetricWithExplanation
          label={insight.opportunity.title}
          value={insight.opportunity.potentialValue || "Opportunity"}
          sentiment={insight.sentiment}
          dataSource={insight.opportunity.dataSource}
          meaning={insight.meaning}
          action={insight.action}
          icon={getIconComponent("Lightbulb")}
          className={className}
        />
      );

    case "activity":
      return (
        <MetricWithExplanation
          label={insight.activity.type}
          value={insight.activity.entityName || insight.activity.description}
          sentiment={insight.sentiment}
          meaning={undefined}
          icon={getIconComponent("Activity")}
          className={className}
        />
      );

    case "benchmark":
      return (
        <MetricWithExplanation
          label={insight.metric.label}
          value={insight.metric.formattedValue}
          rawValue={insight.metric.currentValue}
          sentiment={insight.sentiment}
          dataSource={insight.metric.dataSource}
          meaning={{
            plainEnglish: insight.meaning.plainEnglish,
            whyItMatters: insight.meaning.whyItMatters,
            benchmark: {
              value: insight.benchmark.value,
              source: insight.benchmark.source,
              label: insight.benchmark.label,
              comparison: insight.benchmark.isGood ? "above" : "below",
            },
          }}
          action={insight.action}
          icon={getIconComponent("BarChart3")}
          className={className}
        />
      );

    case "metric":
      return (
        <MetricWithExplanation
          label={insight.metric.label}
          value={insight.metric.formattedValue}
          rawValue={insight.metric.value}
          unit={insight.metric.unit}
          sentiment={insight.sentiment}
          dataSource={insight.metric.dataSource}
          meaning={insight.meaning}
          action={insight.action}
          icon={getIconComponent("Hash")}
          className={className}
        />
      );

    case "ai_insight":
      return (
        <MetricWithExplanation
          label={`AI ${insight.aiAction}`}
          value={insight.insight}
          sentiment={insight.sentiment}
          dataSource={insight.dataSource}
          meaning={insight.meaning}
          action={insight.action}
          icon={getIconComponent("Sparkles")}
          className={className}
        />
      );

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = insight;
      console.warn("Unknown insight category:", (_exhaustive as AmbientInsight).category);
      return null;
  }
}

// ============================================================================
// List Renderer
// ============================================================================

interface AmbientInsightListProps {
  insights: AmbientInsight[];
  maxItems?: number;
  compact?: boolean;
  className?: string;
}

export function AmbientInsightList({
  insights,
  maxItems = 5,
  compact = false,
  className,
}: AmbientInsightListProps) {
  const visibleInsights = insights.slice(0, maxItems);

  if (visibleInsights.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {visibleInsights.map((insight) => (
        <AmbientInsightRenderer
          key={insight.id}
          insight={insight}
          compact={compact}
        />
      ))}
    </div>
  );
}

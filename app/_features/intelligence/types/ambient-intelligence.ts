/**
 * Ambient Intelligence Types
 *
 * Core type definitions for the ambient intelligence system.
 * These types ensure all insights are:
 * 1. Context-specific (per page/entity)
 * 2. Data-grounded (traceable to real sources)
 * 3. Action-oriented (every insight suggests what to do)
 * 4. Explainable (every metric has meaning)
 */

// ============================================================================
// Intelligence Categories
// ============================================================================

/**
 * Categories of intelligence that can be displayed
 */
export type IntelligenceCategory =
  | "health" // Score-based health indicators (0-100)
  | "trend" // Time-series with direction (up/down/stable)
  | "alert" // Actionable warnings requiring attention
  | "opportunity" // Growth/improvement suggestions
  | "activity" // Recent events timeline
  | "benchmark" // Comparison to targets/historical/portfolio
  | "metric" // Simple metric display
  | "ai_insight"; // AI-generated insight (explicitly labeled)

/**
 * AI Confidence Level
 * Used to indicate how confident the AI is in its analysis
 * Research: Users trust AI more when confidence is disclosed
 */
export type AIConfidence = "high" | "medium" | "low";

/**
 * AI Action Type - What the AI did to generate the insight
 * Research: "Disclosures should label the action, not just the feature"
 */
export type AIAction =
  | "summarized" // AI condensed data into summary
  | "analyzed" // AI performed analysis
  | "generated" // AI generated new content
  | "suggested" // AI made a suggestion
  | "predicted"; // AI made a prediction

/**
 * Sentiment for visual styling
 * Maps to semantic colors in the design system
 */
export type InsightSentiment =
  | "positive" // text-success, bg-success/10
  | "negative" // text-destructive, bg-destructive/10
  | "warning" // text-warning, bg-warning/10
  | "neutral"; // text-muted-foreground

/**
 * Urgency level for prioritization and visual treatment
 */
export type InsightUrgency = "critical" | "high" | "medium" | "low";

// ============================================================================
// Data Source Tracking (Anti-Hallucination)
// ============================================================================

/**
 * Every metric MUST declare its data source.
 * This prevents AI from inventing numbers.
 */
export interface DataSource {
  /** Database table the data comes from */
  table: string;
  /** Description of the computation/query */
  computation: string;
  /** When this data was computed */
  computedAt: Date;
  /** Optional: specific entity IDs used */
  entityIds?: string[];
}

/**
 * Benchmark sources - where comparison values come from
 */
export type BenchmarkSource =
  | "user_historical" // User's own past performance
  | "portfolio_avg" // Average across user's portfolio
  | "defined_target" // User-defined target/goal
  | "time_comparison"; // vs previous period (week, month, etc.)

// ============================================================================
// Core Insight Types
// ============================================================================

/**
 * The meaning layer - explains WHAT and WHY
 * AI can write these explanations, but based on real data
 */
export interface InsightMeaning {
  /** Plain English explanation: "This means..." */
  plainEnglish: string;
  /** Why it matters: "This matters because..." */
  whyItMatters: string;
  /** Optional benchmark comparison */
  benchmark?: {
    value: number;
    source: BenchmarkSource;
    label: string; // "Industry avg", "Your best month", "Target"
    comparison: "above" | "below" | "at" | "near";
  };
}

/**
 * The action layer - what to do about it
 */
export interface InsightAction {
  /** Button/link label */
  label: string;
  /** Navigation href */
  href?: string;
  /** Action ID for client-side handlers */
  actionId?: string;
  /** Urgency affects visual treatment */
  urgency: InsightUrgency;
  /** Optional: Icon name from lucide-react */
  icon?: string;
}

/**
 * Base insight structure - all insights extend this
 */
export interface BaseInsight {
  /** Unique identifier */
  id: string;
  /** Intelligence category */
  category: IntelligenceCategory;
  /** Visual sentiment */
  sentiment: InsightSentiment;
  /** Priority for sorting (1-10, higher = more important) */
  priority: number;
  /** When this insight was generated */
  generatedAt: Date;
}

// ============================================================================
// Specific Insight Types
// ============================================================================

/**
 * Health Score Insight
 * Shows a 0-100 score with contributing factors
 */
export interface HealthInsight extends BaseInsight {
  category: "health";
  metric: {
    label: string;
    score: number; // 0-100
    status: "healthy" | "warning" | "critical";
    dataSource: DataSource;
  };
  factors: Array<{
    factor: string;
    impact: number; // positive or negative
    reason: string;
  }>;
  meaning: InsightMeaning;
  action?: InsightAction;
}

/**
 * Trend Insight
 * Shows a metric with historical trend
 */
export interface TrendInsight extends BaseInsight {
  category: "trend";
  metric: {
    label: string;
    value: number;
    unit?: string;
    formattedValue: string; // Pre-formatted: "$15.2k", "78%"
    dataSource: DataSource;
  };
  trend: {
    direction: "up" | "down" | "stable";
    changePercent: number;
    changeAbsolute: number;
    period: string; // "vs last month", "this week"
    sparklineData?: number[]; // Last 7-12 data points
  };
  meaning: InsightMeaning;
  action?: InsightAction;
}

/**
 * Alert Insight
 * Actionable warning requiring attention
 */
export interface AlertInsight extends BaseInsight {
  category: "alert";
  alert: {
    title: string;
    description: string;
    entityType: "client" | "project" | "invoice" | "task" | "system";
    entityId?: string;
    entityName?: string;
    dataSource: DataSource;
  };
  meaning: InsightMeaning;
  action: InsightAction; // Alerts MUST have an action
}

/**
 * Opportunity Insight
 * Growth or improvement suggestion
 */
export interface OpportunityInsight extends BaseInsight {
  category: "opportunity";
  opportunity: {
    title: string;
    description: string;
    potentialValue?: string; // "$2,400/month", "3 new clients"
    confidence: "high" | "medium" | "low";
    dataSource: DataSource;
  };
  meaning: InsightMeaning;
  action: InsightAction;
}

/**
 * Activity Insight
 * Recent event in timeline
 */
export interface ActivityInsight extends BaseInsight {
  category: "activity";
  activity: {
    type: "message" | "invoice" | "meeting" | "file" | "project" | "task";
    description: string;
    timestamp: Date;
    entityId?: string;
    entityName?: string;
    actorName?: string;
  };
  action?: InsightAction;
}

/**
 * Benchmark Insight
 * Comparison to a reference point
 */
export interface BenchmarkInsight extends BaseInsight {
  category: "benchmark";
  metric: {
    label: string;
    currentValue: number;
    formattedValue: string;
    dataSource: DataSource;
  };
  benchmark: {
    value: number;
    formattedValue: string;
    source: BenchmarkSource;
    label: string;
    percentDiff: number;
    isGood: boolean; // Being above/below benchmark is good/bad
  };
  meaning: InsightMeaning;
  action?: InsightAction;
}

/**
 * Simple Metric Insight
 * Just a number with optional context
 */
export interface MetricInsight extends BaseInsight {
  category: "metric";
  metric: {
    label: string;
    value: number;
    formattedValue: string;
    unit?: string;
    dataSource: DataSource;
  };
  meaning?: InsightMeaning;
  action?: InsightAction;
}

/**
 * AI-Generated Insight
 * Explicitly labeled as AI-generated with confidence and provenance
 * Research: Clear disclosure increases user trust
 */
export interface AIInsight extends BaseInsight {
  category: "ai_insight";
  /** The AI-generated insight text */
  insight: string;
  /** What action the AI performed to generate this */
  aiAction: AIAction;
  /** Confidence level of the AI analysis */
  confidence: AIConfidence;
  /** Data sources that informed this insight */
  dataSource: DataSource;
  /** Supporting data points that back the insight */
  supportingData?: Array<{
    label: string;
    value: string;
    source: string;
  }>;
  /** Meaning and context */
  meaning?: InsightMeaning;
  /** Suggested action to take */
  action?: InsightAction;
}

/**
 * Union of all insight types
 */
export type AmbientInsight =
  | HealthInsight
  | TrendInsight
  | AlertInsight
  | OpportunityInsight
  | ActivityInsight
  | BenchmarkInsight
  | MetricInsight
  | AIInsight;

// ============================================================================
// Panel Section Types
// ============================================================================

/**
 * A section in the ambient panel
 */
export interface AmbientSection {
  id: string;
  title: string;
  icon?: string; // lucide-react icon name
  insights: AmbientInsight[];
  /** Max items to show before "View all" */
  maxVisible: number;
  /** Link for "View all" overflow */
  viewAllHref?: string;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Complete ambient panel data for a page
 */
export interface AmbientPanelPayload {
  /** Page context type */
  pageType: string;
  /** Entity context (clientId, projectId, etc.) */
  context?: Record<string, string>;
  /** Sections to render */
  sections: AmbientSection[];
  /** When this payload was generated */
  generatedAt: Date;
  /** Data freshness indicator */
  dataAge: "fresh" | "cached" | "stale";
}

// ============================================================================
// Quick Actions
// ============================================================================

/**
 * Quick action for the ambient panel
 */
export interface AmbientQuickAction {
  id: string;
  label: string;
  icon: string; // lucide-react icon name
  href?: string;
  onClick?: string; // Action ID for client-side
  disabled?: boolean;
  badge?: string; // Optional badge (e.g., "3" for unread count)
}

// ============================================================================
// Type Guards
// ============================================================================

export function isHealthInsight(insight: AmbientInsight): insight is HealthInsight {
  return insight.category === "health";
}

export function isTrendInsight(insight: AmbientInsight): insight is TrendInsight {
  return insight.category === "trend";
}

export function isAlertInsight(insight: AmbientInsight): insight is AlertInsight {
  return insight.category === "alert";
}

export function isOpportunityInsight(insight: AmbientInsight): insight is OpportunityInsight {
  return insight.category === "opportunity";
}

export function isActivityInsight(insight: AmbientInsight): insight is ActivityInsight {
  return insight.category === "activity";
}

export function isBenchmarkInsight(insight: AmbientInsight): insight is BenchmarkInsight {
  return insight.category === "benchmark";
}

export function isMetricInsight(insight: AmbientInsight): insight is MetricInsight {
  return insight.category === "metric";
}

export function isAIInsight(insight: AmbientInsight): insight is AIInsight {
  return insight.category === "ai_insight";
}

/**
 * Intelligence Feature - Components
 *
 * UI components for AI intelligence streams, filters, and ambient insights.
 * Implements research-backed patterns for data accuracy and user trust.
 */

// Existing intelligence stream components
export { IntelligenceFilters } from "./intelligence-filters";
export type { FilterState } from "./intelligence-filters";

export { IntelligenceStreamItem } from "./intelligence-stream-item";
export type { IntelligenceEvent } from "./intelligence-stream-item";

// Ambient Intelligence Components (Three-Layer Interaction Model)
export { MetricWithExplanation } from "./MetricWithExplanation";
export { AlertCard } from "./AlertCard";
export { HealthScoreCard } from "./HealthScoreCard";
export type { HealthScoreCardProps, HealthScoreVariant, HealthFactor } from "./HealthScoreCard";
export { TrendCard } from "./TrendCard";
export type { TrendCardProps, TrendDataPoint } from "./TrendCard";
export { OpportunityCard } from "./OpportunityCard";
export type { OpportunityCardProps, OpportunityImpact, OpportunityConfidence, OpportunityType } from "./OpportunityCard";
export { BenchmarkCard } from "./BenchmarkCard";
export type { BenchmarkCardProps, BenchmarkSource, BenchmarkComparison } from "./BenchmarkCard";

// ============================================================================
// Data Accuracy & Trust Components (Research-Backed)
// ============================================================================

// Data Provenance Indicators (Anti-Hallucination)
export {
  InlineProvenance,
  CompactProvenance,
  ExpandableProvenance,
  ProvenanceCard,
} from "./DataProvenanceIndicator";
export type {
  InlineProvenanceProps,
  CompactProvenanceProps,
  ExpandableProvenanceProps,
  ProvenanceCardProps,
} from "./DataProvenanceIndicator";

// AI Disclosure Components (Trust & Transparency)
export {
  AIBadge,
  AIDisclosureText,
  ConfidenceIndicator,
  AIInsightCard,
  AISectionHeader,
} from "./AIDisclosure";
export type {
  AIBadgeProps,
  AIDisclosureTextProps,
  ConfidenceIndicatorProps,
  AIInsightCardProps,
  AISectionHeaderProps,
  AIConfidence,
} from "./AIDisclosure";

// Freshness Indicators
export {
  FreshnessIndicator,
  getFreshnessLevel,
  formatTimeAgo,
  formatFullDate,
} from "./FreshnessIndicator";
export type {
  FreshnessIndicatorProps,
  FreshnessLevel,
} from "./FreshnessIndicator";

// Container Components
export { InsightSection, InsightEmptyState } from "./InsightSection";

// Renderers
export { AmbientInsightRenderer, AmbientInsightList } from "./AmbientInsightRenderer";

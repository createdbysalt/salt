/**
 * Intelligence Feature Index
 *
 * Exports all public APIs from the intelligence feature module.
 * Includes the ambient intelligence system for contextual insights.
 */

// Types
export type {
  AmbientInsight,
  HealthInsight,
  TrendInsight,
  AlertInsight,
  OpportunityInsight,
  ActivityInsight,
  BenchmarkInsight,
  MetricInsight,
  DataSource,
  InsightMeaning,
  InsightAction,
  InsightSentiment,
  InsightUrgency,
} from "./types/ambient-intelligence";

// Page Intelligence Registry
export {
  PAGE_INTELLIGENCE_REGISTRY,
  SECTION_CONFIGS,
  getPageIntelligenceConfig,
  getPageSections,
  pageRequiresContext,
  getAvailablePageTypes,
} from "./config/page-intelligence-registry";
export type {
  PageIntelligenceConfig,
  SectionConfig,
  IntelligenceSectionType,
} from "./config/page-intelligence-registry";

// Generators
export {
  generateClientHealthInsight,
  generatePortfolioHealthInsight,
  generateMRRTrendInsight,
  generateClientCountTrendInsight,
  generateClientLTVInsight,
  generateClientAttentionAlerts,
  generateOverdueInvoiceAlerts,
  generateUpcomingMeetingAlerts,
  generateProjectAlerts,
  generateAllAlerts,
  generateStudioInsights,
  generateClientInsights,
} from "./generators";

// Components
export {
  MetricWithExplanation,
  AlertCard,
  InsightSection,
  InsightEmptyState,
  AmbientInsightRenderer,
  AmbientInsightList,
} from "./components";

// Hooks
export { usePageIntelligence } from "./hooks";

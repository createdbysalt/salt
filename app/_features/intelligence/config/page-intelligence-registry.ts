/**
 * Page Intelligence Registry
 *
 * Defines what intelligence each page should display in the ambient panel.
 * Each page type has:
 * - sections: What intelligence sections to show
 * - maxInsights: Cognitive load limit
 * - refreshInterval: How often to refresh (ms)
 * - contextRequired: What entity IDs are needed
 * - question: The core question this panel answers
 */

import type { InsightUrgency } from "../types/ambient-intelligence";

// ============================================================================
// Section Definitions
// ============================================================================

/**
 * Available intelligence section types
 */
export type IntelligenceSectionType =
  // Health & Status
  | "portfolio-health"
  | "client-health"
  | "project-health"
  | "pipeline-health"
  // Alerts & Attention
  | "urgent-alerts"
  | "needs-attention"
  | "blockers"
  | "overdue-items"
  // Metrics & Trends
  | "revenue-metrics"
  | "today-summary"
  | "weekly-stats"
  | "milestones-due"
  | "seo-summary"
  // Distribution & Pipeline
  | "pipeline"
  | "stage-distribution"
  | "project-distribution"
  // Activity
  | "recent-activity"
  | "upcoming"
  // Actions
  | "quick-actions"
  // AI
  | "ai-insights"
  | "opportunities";

/**
 * Section configuration
 */
export interface SectionConfig {
  type: IntelligenceSectionType;
  title: string;
  icon: string; // lucide-react icon name
  maxItems: number;
  priority: number; // Higher = shown first
  viewAllHref?: string;
}

/**
 * Pre-defined section configurations
 */
export const SECTION_CONFIGS: Record<IntelligenceSectionType, Omit<SectionConfig, "viewAllHref">> = {
  // Health & Status
  "portfolio-health": {
    type: "portfolio-health",
    title: "Portfolio Overview",
    icon: "BarChart3",
    maxItems: 5,
    priority: 100,
  },
  "client-health": {
    type: "client-health",
    title: "Client Health",
    icon: "Heart",
    maxItems: 4,
    priority: 100,
  },
  "project-health": {
    type: "project-health",
    title: "Project Health",
    icon: "Activity",
    maxItems: 4,
    priority: 100,
  },
  "pipeline-health": {
    type: "pipeline-health",
    title: "Pipeline Health",
    icon: "TrendingUp",
    maxItems: 4,
    priority: 90,
  },

  // Alerts & Attention
  "urgent-alerts": {
    type: "urgent-alerts",
    title: "Needs Your Attention",
    icon: "AlertCircle",
    maxItems: 3,
    priority: 95,
  },
  "needs-attention": {
    type: "needs-attention",
    title: "Could Use Attention",
    icon: "AlertTriangle",
    maxItems: 3,
    priority: 90,
  },
  blockers: {
    type: "blockers",
    title: "Blockers",
    icon: "Ban",
    maxItems: 3,
    priority: 95,
  },
  "overdue-items": {
    type: "overdue-items",
    title: "Overdue",
    icon: "Clock",
    maxItems: 3,
    priority: 90,
  },

  // Metrics & Trends
  "revenue-metrics": {
    type: "revenue-metrics",
    title: "Revenue",
    icon: "DollarSign",
    maxItems: 4,
    priority: 85,
  },
  "today-summary": {
    type: "today-summary",
    title: "Today",
    icon: "Calendar",
    maxItems: 4,
    priority: 80,
  },
  "weekly-stats": {
    type: "weekly-stats",
    title: "This Week",
    icon: "BarChart2",
    maxItems: 4,
    priority: 70,
  },
  "milestones-due": {
    type: "milestones-due",
    title: "Milestones",
    icon: "Flag",
    maxItems: 3,
    priority: 85,
  },
  "seo-summary": {
    type: "seo-summary",
    title: "SEO Performance",
    icon: "Search",
    maxItems: 4,
    priority: 60,
  },

  // Distribution & Pipeline
  pipeline: {
    type: "pipeline",
    title: "Pipeline",
    icon: "GitBranch",
    maxItems: 5,
    priority: 75,
  },
  "stage-distribution": {
    type: "stage-distribution",
    title: "Stage Distribution",
    icon: "PieChart",
    maxItems: 5,
    priority: 70,
  },
  "project-distribution": {
    type: "project-distribution",
    title: "Projects by Status",
    icon: "Layers",
    maxItems: 4,
    priority: 70,
  },

  // Activity
  "recent-activity": {
    type: "recent-activity",
    title: "Recent Activity",
    icon: "Clock",
    maxItems: 4,
    priority: 50,
  },
  upcoming: {
    type: "upcoming",
    title: "Upcoming",
    icon: "CalendarDays",
    maxItems: 3,
    priority: 75,
  },

  // Actions
  "quick-actions": {
    type: "quick-actions",
    title: "Quick Actions",
    icon: "Zap",
    maxItems: 4,
    priority: 40,
  },

  // AI
  "ai-insights": {
    type: "ai-insights",
    title: "AI Insights",
    icon: "Sparkles",
    maxItems: 3,
    priority: 65,
  },
  opportunities: {
    type: "opportunities",
    title: "Opportunities",
    icon: "Lightbulb",
    maxItems: 3,
    priority: 60,
  },
};

// ============================================================================
// Page Configuration
// ============================================================================

/**
 * Page intelligence configuration
 */
export interface PageIntelligenceConfig {
  /** Human-readable page name */
  name: string;
  /** The core question this panel answers */
  question: string;
  /** Sections to display (in order) */
  sections: IntelligenceSectionType[];
  /** Maximum total insights across all sections */
  maxInsights: number;
  /** How often to refresh data (ms), undefined = on navigation only */
  refreshInterval?: number;
  /** Required context (entity IDs) */
  contextRequired?: string[];
  /** Tone adjustment for copy */
  tone?: "professional" | "client-friendly";
  /** Alert urgency threshold to show (hides lower urgency) */
  alertThreshold?: InsightUrgency;
}

/**
 * Registry of all page intelligence configurations
 */
export const PAGE_INTELLIGENCE_REGISTRY: Record<string, PageIntelligenceConfig> = {
  // =========================================================================
  // Studio Mode Pages
  // =========================================================================

  "studio-inbox": {
    name: "Studio Inbox",
    question: "What needs my attention right now?",
    sections: ["urgent-alerts", "today-summary", "quick-actions"],
    maxInsights: 8,
    refreshInterval: 60000, // 1 minute
    alertThreshold: "medium",
  },

  "studio-overview": {
    name: "Studio Overview",
    question: "How is my studio doing overall?",
    sections: [
      "portfolio-health",
      "weekly-stats",
      "needs-attention",
      "quick-actions",
    ],
    maxInsights: 12,
    refreshInterval: 300000, // 5 minutes
  },

  "studio-clients-list": {
    name: "Clients List",
    question: "How is my client portfolio doing?",
    sections: [
      "portfolio-health",
      "needs-attention",
      "pipeline",
      "quick-actions",
    ],
    maxInsights: 10,
  },

  "studio-client-detail": {
    name: "Client Detail",
    question: "How is this specific client doing?",
    sections: [
      "client-health",
      "revenue-metrics",
      "upcoming",
      "recent-activity",
      "quick-actions",
    ],
    maxInsights: 12,
    contextRequired: ["clientId"],
  },

  "studio-projects-list": {
    name: "Projects List",
    question: "What's the status of my active projects?",
    sections: [
      "project-distribution",
      "blockers",
      "milestones-due",
      "quick-actions",
    ],
    maxInsights: 10,
  },

  "studio-project-detail": {
    name: "Project Detail",
    question: "Is this project on track?",
    sections: [
      "project-health",
      "milestones-due",
      "blockers",
      "recent-activity",
      "quick-actions",
    ],
    maxInsights: 12,
    contextRequired: ["projectId"],
  },

  "studio-insights": {
    name: "Insights Dashboard",
    question: "What does my data tell me?",
    sections: [
      "revenue-metrics",
      "pipeline-health",
      "opportunities",
      "ai-insights",
    ],
    maxInsights: 14,
    refreshInterval: 300000, // 5 minutes
  },

  "studio-pipeline": {
    name: "Pipeline",
    question: "How healthy is my sales pipeline?",
    sections: [
      "pipeline-health",
      "stage-distribution",
      "needs-attention",
      "quick-actions",
    ],
    maxInsights: 10,
  },

  "studio-messages": {
    name: "Messages",
    question: "What conversations need my response?",
    sections: ["urgent-alerts", "recent-activity", "quick-actions"],
    maxInsights: 8,
    refreshInterval: 30000, // 30 seconds
  },

  // =========================================================================
  // Strategy Mode Pages
  // =========================================================================

  "strategy-intelligence": {
    name: "Intelligence Hub",
    question: "What strategic insights are available?",
    sections: ["ai-insights", "opportunities", "quick-actions"],
    maxInsights: 10,
  },

  "strategy-reports": {
    name: "Reports",
    question: "What reports are ready or in progress?",
    sections: ["recent-activity", "quick-actions"],
    maxInsights: 8,
  },

  // =========================================================================
  // Serve Mode Pages
  // =========================================================================

  "serve-portal": {
    name: "Portal Management",
    question: "How are my client portals performing?",
    sections: ["needs-attention", "recent-activity", "quick-actions"],
    maxInsights: 8,
  },

  // =========================================================================
  // Bridge (Client Portal) Pages
  // =========================================================================

  "bridge-home": {
    name: "Client Portal Home",
    question: "What's happening with my projects?",
    sections: ["project-distribution", "upcoming", "recent-activity"],
    maxInsights: 8,
    tone: "client-friendly",
    alertThreshold: "high", // Don't alarm clients with medium alerts
  },

  "bridge-project-detail": {
    name: "Client Project View",
    question: "How is this project progressing?",
    sections: ["project-health", "milestones-due", "recent-activity"],
    maxInsights: 8,
    contextRequired: ["projectId"],
    tone: "client-friendly",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the intelligence configuration for a page
 */
export function getPageIntelligenceConfig(
  pageType: string
): PageIntelligenceConfig | undefined {
  return PAGE_INTELLIGENCE_REGISTRY[pageType];
}

/**
 * Get section configurations for a page
 */
export function getPageSections(pageType: string): SectionConfig[] {
  const config = PAGE_INTELLIGENCE_REGISTRY[pageType];
  if (!config) return [];

  return config.sections
    .map((sectionType) => SECTION_CONFIGS[sectionType])
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Check if a page requires specific context
 */
export function pageRequiresContext(
  pageType: string,
  contextKey: string
): boolean {
  const config = PAGE_INTELLIGENCE_REGISTRY[pageType];
  return config?.contextRequired?.includes(contextKey) ?? false;
}

/**
 * Get all available page types
 */
export function getAvailablePageTypes(): string[] {
  return Object.keys(PAGE_INTELLIGENCE_REGISTRY);
}

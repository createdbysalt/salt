/**
 * Type definitions for Insights dashboard data
 */

export interface RevenueAnalytics {
  mrr: number; // Monthly Recurring Revenue (active subscriptions)
  oneTimeThisMonth: number;
  oneTimeThisQuarter: number;
  revenueByMonth: Array<{
    month: string; // "Jan 2026"
    mrr: number;
    oneTime: number;
    total: number;
  }>;
  forecast: {
    nextMonth: number;
    nextQuarter: number;
  };
}

export interface GrowthOpportunities {
  clientsWithoutRetainers: Array<{
    id: string;
    name: string;
    ltv: number;
    lastProjectValue: number | null;
  }>;
  averageProjectValueTrend: Array<{
    period: string;
    avgValue: number;
  }>;
}

export interface ChurnRisk {
  atRiskClients: Array<{
    id: string;
    name: string;
    healthScore: number;
    mrr: number;
    reason: string;
  }>;
  expiringRetainers: Array<{
    clientId: string;
    clientName: string;
    projectId: string;
    projectName: string;
    expiresAt: string;
    mrr: number;
    daysRemaining: number;
  }>;
  estimatedMrrAtRisk: number;
}

export interface ClientAnalytics {
  healthDistribution: {
    healthy: number; // 80-100
    warning: number; // 50-79
    atRisk: number; // 0-49
  };
  lastContactDistribution: {
    last7days: number;
    last30days: number;
    last90days: number;
    over90days: number;
  };
  averageLtv: number;
  averageLifespanMonths: number;
  monthlyChurnRate: number;
}

export interface ProjectAnalytics {
  onTimeCompletionRate: number;
  averageDurationDays: number;
  activeProjectsCount: number;
  completedThisMonth: number;
  milestoneCompletionRate: number; // For projects with milestones
}

export interface OperationalEfficiency {
  // Limited to what we have - show empty states for missing data
  tasksCompleted: number;
  tasksActive: number;
  meetingsThisMonth: number;
  hasTimeTrackingData: boolean; // Will be false in Phase 1
  hasSupportTicketData: boolean; // Will be false in Phase 1
}

export interface InsightsDashboardData {
  revenue: RevenueAnalytics;
  growth: GrowthOpportunities;
  churn: ChurnRisk;
  clients: ClientAnalytics;
  projects: ProjectAnalytics;
  operations: OperationalEfficiency;
  generatedAt: string;
}

// =============================================================================
// STUDIO DASHBOARD (Home Page)
// =============================================================================

/**
 * Metric card data for the studio dashboard
 * Maps to the 4 top-level cards: Revenue, Active Clients, Projects, Pipeline
 */
export interface MetricCard {
  title: string;
  value: string; // Formatted value (e.g., "$8,400" or "6")
  rawValue: number; // Raw number for calculations
  badge: {
    value: string; // e.g., "+12%" or "3 pending"
    trend: "up" | "down" | "neutral";
  };
  context: {
    line1: string; // e.g., "Up 12% from last month"
    line2: string; // e.g., "MRR: $2,400 · One-time: $5,600"
  };
  /** Sparkline data for inline mini-chart (last 14 days) */
  sparkline?: Array<{ value: number; label?: string }>;
}

/**
 * Recent win event for the dashboard
 */
export interface RecentWin {
  id: string;
  type: "invoice_paid" | "project_completed" | "new_client" | "proposal_accepted";
  title: string;
  subtitle: string;
  amount?: number; // For invoice/proposal wins
  timestamp: Date;
  href: string;
}

/**
 * Chart data point for revenue trend
 */
export interface RevenueChartPoint {
  date: string; // ISO date string for the chart
  recurring: number; // MRR
  oneTime: number; // One-time payments
}

/**
 * Action item for the dashboard "Needs Attention" section
 */
export interface ActionItem {
  id: string;
  type: "invoice" | "lead" | "milestone" | "proposal";
  title: string;
  subtitle: string; // Client name or context
  status: "overdue" | "due_soon" | "pending" | "stale";
  amount?: number;
  dueDate?: Date;
  daysOverdue?: number;
  daysInStage?: number;
  href: string;
}

/**
 * Complete studio dashboard data
 */
export interface StudioDashboardData {
  // Tier 1: The Pulse (4 metric cards)
  metrics: {
    revenue: MetricCard;
    activeClients: MetricCard;
    projectsInFlight: MetricCard;
    pipelineValue: MetricCard;
  };

  // Tier 2: Chart data
  revenueChart: RevenueChartPoint[];

  // Tier 3: Action items and recent wins
  actionItems: ActionItem[];
  recentWins: RecentWin[];

  // Metadata
  generatedAt: string;
}


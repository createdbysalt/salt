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


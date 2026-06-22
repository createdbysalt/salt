"use server";

import type { InsightsDashboardData } from "./types";
import { getRevenueAnalytics } from "./get-revenue-analytics";
import { getClientAnalytics } from "./get-client-analytics";
import { getProjectAnalytics } from "./get-project-analytics";
import { getOperationalEfficiency } from "./get-operational-efficiency";

/**
 * Orchestrator action that returns complete Insights dashboard data
 * Calls all individual analytics actions and combines into single payload
 */
export async function getInsightsDashboard(): Promise<InsightsDashboardData> {
  // Fetch all analytics in parallel for performance
  const [revenue, clientData, projects, operations] = await Promise.all([
    getRevenueAnalytics(),
    getClientAnalytics(),
    getProjectAnalytics(),
    getOperationalEfficiency(),
  ]);

  return {
    revenue,
    growth: clientData.growth,
    churn: clientData.churn,
    clients: clientData.analytics,
    projects,
    operations,
    generatedAt: new Date().toISOString(),
  };
}


"use server";

/**
 * Insights Feature - Query Functions
 *
 * Analytics and insights data fetching.
 * These are read-only operations for dashboard analytics.
 *
 * Usage:
 *   import { getInsightsDashboard, getRevenueAnalytics } from '@/app/_features/insights/queries'
 */

// Dashboard orchestrator
export { getInsightsDashboard } from "@/app/actions/insights/get-insights-dashboard";

// Individual analytics
export { getRevenueAnalytics } from "@/app/actions/insights/get-revenue-analytics";
export { getClientAnalytics } from "@/app/actions/insights/get-client-analytics";
export { getProjectAnalytics } from "@/app/actions/insights/get-project-analytics";
export { getOperationalEfficiency } from "@/app/actions/insights/get-operational-efficiency";

// AI-powered insights
export { getAIInsights } from "@/app/actions/insights/get-ai-insights";

// Types
export type { InsightsDashboardData } from "@/app/actions/insights/types";

/**
 * Intelligence Generators Index
 *
 * Exports all insight generator functions for the ambient intelligence system.
 * Each generator produces insights from real database data with full traceability.
 */

// Health Generators
export {
  generateClientHealthInsight,
  generatePortfolioHealthInsight,
} from "./health-generator";

// Trend Generators
export {
  generateMRRTrendInsight,
  generateClientCountTrendInsight,
  generateClientLTVInsight,
} from "./trend-generator";

// Alert Generators
export {
  generateClientAttentionAlerts,
  generateOverdueInvoiceAlerts,
  generateUpcomingMeetingAlerts,
  generateProjectAlerts,
  generateAllAlerts,
} from "./alert-generator";

// ============================================================================
// Aggregated Generator
// ============================================================================

import type { AmbientInsight } from "../types/ambient-intelligence";
import { generatePortfolioHealthInsight } from "./health-generator";
import { generateMRRTrendInsight, generateClientCountTrendInsight } from "./trend-generator";
import { generateAllAlerts } from "./alert-generator";

/**
 * Generate all studio-level insights
 * Combines health, trends, and alerts for the studio overview
 */
export async function generateStudioInsights(
  studioId: string
): Promise<AmbientInsight[]> {
  const [portfolioHealth, mrrTrend, clientTrend, alerts] = await Promise.all([
    generatePortfolioHealthInsight(studioId),
    generateMRRTrendInsight(studioId),
    generateClientCountTrendInsight(studioId),
    generateAllAlerts(studioId),
  ]);

  const insights: AmbientInsight[] = [];

  if (portfolioHealth) insights.push(portfolioHealth);
  if (mrrTrend) insights.push(mrrTrend);
  if (clientTrend) insights.push(clientTrend);
  insights.push(...alerts);

  // Sort by priority (highest first)
  return insights.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate client-specific insights
 */
export async function generateClientInsights(
  clientId: string
): Promise<AmbientInsight[]> {
  const { generateClientHealthInsight } = await import("./health-generator");
  const { generateClientLTVInsight } = await import("./trend-generator");

  const [healthInsight, ltvInsight] = await Promise.all([
    generateClientHealthInsight(clientId),
    generateClientLTVInsight(clientId),
  ]);

  const insights: AmbientInsight[] = [];

  if (healthInsight) insights.push(healthInsight);
  if (ltvInsight) insights.push(ltvInsight);

  return insights.sort((a, b) => b.priority - a.priority);
}

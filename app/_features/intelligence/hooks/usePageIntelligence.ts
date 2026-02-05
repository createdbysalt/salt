"use client";

/**
 * usePageIntelligence Hook
 *
 * Sets up intelligent ambient panel for a page.
 * Automatically fetches and refreshes insights based on page configuration.
 */

import { useEffect, useCallback } from "react";
import { useAmbientPanelSafe } from "@/app/_features/shell/contexts/AmbientPanelContext";
import {
  getPageIntelligenceConfig,
  type PageIntelligenceConfig,
} from "../config/page-intelligence-registry";
import type { AmbientInsight } from "../types/ambient-intelligence";

// ============================================================================
// Types
// ============================================================================

interface UsePageIntelligenceOptions {
  /** Page type from registry */
  pageType: string;
  /** Context values (clientId, projectId, etc.) */
  context?: {
    studioId?: string;
    clientId?: string;
    projectId?: string;
    [key: string]: string | undefined;
  };
  /** Custom insight fetcher (override default) */
  fetchInsights?: () => Promise<AmbientInsight[]>;
  /** Whether to auto-refresh */
  autoRefresh?: boolean;
  /** Dependencies for re-fetching */
  deps?: unknown[];
}

interface UsePageIntelligenceReturn {
  pageConfig: PageIntelligenceConfig | null;
  insights: AmbientInsight[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// Default Insight Fetchers (by page type)
// ============================================================================

async function fetchDefaultInsights(
  pageType: string,
  context: UsePageIntelligenceOptions["context"]
): Promise<AmbientInsight[]> {
  // Import generators dynamically to avoid circular deps
  const generators = await import("../generators");

  switch (pageType) {
    case "studio-overview":
    case "studio-inbox":
      if (context?.studioId) {
        return generators.generateStudioInsights(context.studioId);
      }
      return [];

    case "studio-clients-list":
      if (context?.studioId) {
        const [portfolioHealth, clientTrend, alerts] = await Promise.all([
          generators.generatePortfolioHealthInsight(context.studioId),
          generators.generateClientCountTrendInsight(context.studioId),
          generators.generateClientAttentionAlerts(context.studioId),
        ]);
        const insights: AmbientInsight[] = [];
        if (portfolioHealth) insights.push(portfolioHealth);
        if (clientTrend) insights.push(clientTrend);
        insights.push(...alerts);
        return insights.sort((a, b) => b.priority - a.priority);
      }
      return [];

    case "studio-client-detail":
      if (context?.clientId) {
        return generators.generateClientInsights(context.clientId);
      }
      return [];

    case "studio-projects-list":
      if (context?.studioId) {
        const projectAlerts = await generators.generateProjectAlerts(context.studioId);
        return projectAlerts;
      }
      return [];

    case "studio-project-detail":
      if (context?.studioId && context?.projectId) {
        const projectAlerts = await generators.generateProjectAlerts(
          context.studioId,
          context.projectId
        );
        return projectAlerts;
      }
      return [];

    case "studio-insights":
      if (context?.studioId) {
        const [mrrTrend, portfolioHealth] = await Promise.all([
          generators.generateMRRTrendInsight(context.studioId),
          generators.generatePortfolioHealthInsight(context.studioId),
        ]);
        const insights: AmbientInsight[] = [];
        if (mrrTrend) insights.push(mrrTrend);
        if (portfolioHealth) insights.push(portfolioHealth);
        return insights;
      }
      return [];

    default:
      return [];
  }
}

// ============================================================================
// Main Hook
// ============================================================================

export function usePageIntelligence({
  pageType,
  context = {},
  fetchInsights,
  autoRefresh = true,
  deps = [],
}: UsePageIntelligenceOptions): UsePageIntelligenceReturn {
  const { data, setData, setInsights, setLoading, setError } = useAmbientPanelSafe();

  // Get page configuration
  const pageConfig = getPageIntelligenceConfig(pageType) || null;

  // Fetch function
  const loadInsights = useCallback(async () => {
    if (!pageConfig) return;

    setLoading(true);
    setError(undefined);

    try {
      const insights = fetchInsights
        ? await fetchInsights()
        : await fetchDefaultInsights(pageType, context);

      // Limit insights to maxInsights from config
      const limitedInsights = insights.slice(0, pageConfig.maxInsights);

      setInsights(limitedInsights);
    } catch (error) {
      console.error(`Error fetching insights for ${pageType}:`, error);
      setError(error instanceof Error ? error.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [pageType, pageConfig, context, fetchInsights, setInsights, setLoading, setError]);

  // Initialize intelligent panel on mount
  useEffect(() => {
    if (!pageConfig) return;

    setData({
      type: "intelligent",
      pageType,
      pageConfig,
      context,
      insights: [],
      loading: true,
    });

    // Initial fetch
    loadInsights();

    // Cleanup on unmount
    return () => {
      setData({ type: "default" });
    };
  }, [pageType, JSON.stringify(context), ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !pageConfig?.refreshInterval) return;

    const interval = setInterval(loadInsights, pageConfig.refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, pageConfig?.refreshInterval, loadInsights]);

  // Extract state from context
  const isIntelligent = data.type === "intelligent";
  const intelligentData = isIntelligent ? data : null;

  return {
    pageConfig,
    insights: (intelligentData?.insights as AmbientInsight[]) ?? [],
    loading: intelligentData?.loading ?? false,
    error: intelligentData?.error ?? null,
    refresh: loadInsights,
  };
}

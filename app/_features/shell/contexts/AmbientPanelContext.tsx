"use client";

/**
 * AmbientPanelContext STUB
 *
 * The ambient panel (right sidebar) has been removed from the main shell.
 * This stub provides no-op implementations to maintain backward compatibility
 * with existing hooks that reference the ambient panel.
 *
 * The full implementation is preserved in _deprecated/AmbientPanelContext.tsx
 * for future re-implementation.
 */

// Type exports (preserved for compatibility)
export type ClientsListAmbientData = {
  type: "clients-list";
  metrics: {
    totalClients: number;
    activeClients: number;
    totalMRR: number;
    mrrChange: number;
    avgHealthScore: number;
  };
  needsAttention: Array<{
    clientId: string;
    clientName: string;
    reason: string;
    severity: "high" | "medium" | "low";
  }>;
  stageDistribution: Record<string, number>;
};

export type ClientDetailAmbientData = {
  type: "client-detail";
  client: {
    id: string;
    name: string;
    healthScore: number;
    healthFactors: Array<{ factor: string; impact: number; reason: string }>;
    ltv: number;
    mrr: number;
    projectCount: number;
    lastContactAt: Date | null;
    status: string;
  };
  upcomingMeetings: Array<{
    id: string;
    title: string;
    date: Date;
  }>;
  recentActivity: Array<{
    id: string;
    type: "message" | "invoice" | "meeting" | "file" | "project";
    description: string;
    timestamp: Date;
    href?: string;
  }>;
};

export type IntelligentAmbientData = {
  type: "intelligent";
  pageType: string;
  pageConfig: unknown;
  context: Record<string, string | undefined>;
  insights: unknown[];
  loading: boolean;
  error?: string;
};

export type DefaultAmbientData = {
  type: "default";
};

export type AmbientPanelData =
  | ClientsListAmbientData
  | ClientDetailAmbientData
  | IntelligentAmbientData
  | DefaultAmbientData
  | null;

// Default data for stub
const defaultData: DefaultAmbientData = { type: "default" };

/**
 * No-op hook for ambient panel
 * Returns stub functions that do nothing
 */
export function useAmbientPanelSafe() {
  return {
    data: defaultData as AmbientPanelData & { type: string },
    setData: (_data: unknown) => {},
    setInsights: (_insights: unknown[]) => {},
    setLoading: (_loading: boolean) => {},
    setError: (_error: string | undefined) => {},
    resetToDefault: () => {},
  };
}

/**
 * No-op hook for ambient panel (alias)
 */
export function useAmbientPanel() {
  return useAmbientPanelSafe();
}

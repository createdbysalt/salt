"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import type { AmbientInsight } from "@/app/_features/intelligence/types/ambient-intelligence";
import type { PageIntelligenceConfig } from "@/app/_features/intelligence/config/page-intelligence-registry";

/**
 * Ambient Panel Context Types
 *
 * The ambient panel shows contextual insights based on the current view.
 * Pages can set their own metrics, alerts, and quick actions.
 *
 * NEW: Supports the ambient intelligence system with typed insights,
 * data source traceability, and three-layer interaction model.
 */

export type AmbientPanelContextType =
  | "default" // Default studio overview
  | "clients-list" // Client portfolio view
  | "client-detail" // Individual client view
  | "projects-list" // Projects overview
  | "project-detail" // Individual project view
  | "studio-inbox" // Studio inbox view
  | "studio-overview" // Studio overview dashboard
  | "studio-insights" // Insights dashboard
  | "studio-pipeline" // Pipeline view
  | "studio-messages"; // Messages view

// Legacy types (kept for backwards compatibility)
export interface AmbientMetric {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
  };
  sparklineData?: number[];
}

export interface AmbientAlert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface AmbientQuickAction {
  id: string;
  label: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}

export interface AmbientActivity {
  id: string;
  type: "message" | "invoice" | "meeting" | "file" | "project";
  description: string;
  timestamp: Date;
  href?: string;
}

// Client-specific context data
export interface ClientsListAmbientData {
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
}

export interface ClientDetailAmbientData {
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
  recentActivity: AmbientActivity[];
}

// New Intelligent Panel Data (with full insight system)
export interface IntelligentPanelData {
  type: "intelligent";
  pageType: string;
  pageConfig: PageIntelligenceConfig;
  context?: {
    studioId?: string;
    clientId?: string;
    projectId?: string;
    [key: string]: string | undefined;
  };
  insights: AmbientInsight[];
  loading?: boolean;
  error?: string;
  lastRefreshed?: Date;
}

export type AmbientPanelData =
  | { type: "default" }
  | ClientsListAmbientData
  | ClientDetailAmbientData
  | IntelligentPanelData;

interface AmbientPanelContextValue {
  data: AmbientPanelData;
  setData: (data: AmbientPanelData) => void;
  resetToDefault: () => void;
  // New methods for intelligent panels
  setInsights: (insights: AmbientInsight[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | undefined) => void;
}

const defaultData: AmbientPanelData = { type: "default" };

const AmbientPanelContext = createContext<AmbientPanelContextValue | null>(
  null
);

/**
 * Provider for ambient panel context
 * Allows pages to set contextual data for the right sidebar
 */
export function AmbientPanelProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AmbientPanelData>(defaultData);

  const setData = useCallback((newData: AmbientPanelData) => {
    setDataState(newData);
  }, []);

  const resetToDefault = useCallback(() => {
    setDataState(defaultData);
  }, []);

  // New method for updating insights in intelligent panels
  const setInsights = useCallback((insights: AmbientInsight[]) => {
    setDataState((prev) => {
      if (prev.type === "intelligent") {
        return {
          ...prev,
          insights,
          lastRefreshed: new Date(),
        };
      }
      return prev;
    });
  }, []);

  // New method for setting loading state
  const setLoading = useCallback((loading: boolean) => {
    setDataState((prev) => {
      if (prev.type === "intelligent") {
        return {
          ...prev,
          loading,
        };
      }
      return prev;
    });
  }, []);

  // New method for setting error state
  const setError = useCallback((error: string | undefined) => {
    setDataState((prev) => {
      if (prev.type === "intelligent") {
        return {
          ...prev,
          error,
          loading: false,
        };
      }
      return prev;
    });
  }, []);

  return (
    <AmbientPanelContext.Provider
      value={{ data, setData, resetToDefault, setInsights, setLoading, setError }}
    >
      {children}
    </AmbientPanelContext.Provider>
  );
}

/**
 * Hook to access ambient panel context
 * Must be used within AmbientPanelProvider
 */
export function useAmbientPanel() {
  const context = useContext(AmbientPanelContext);
  if (context === null) {
    throw new Error(
      "useAmbientPanel must be used within AmbientPanelProvider"
    );
  }
  return context;
}

/**
 * Safe hook to access ambient panel context
 * Returns default values if context is not available
 */
export function useAmbientPanelSafe(): AmbientPanelContextValue {
  const context = useContext(AmbientPanelContext);
  if (context === null) {
    return {
      data: defaultData,
      setData: () => {},
      resetToDefault: () => {},
      setInsights: () => {},
      setLoading: () => {},
      setError: () => {},
    };
  }
  return context;
}

/**
 * Hook for intelligent panel data
 * Provides typed access to intelligent panel state
 */
export function useIntelligentPanel() {
  const { data, setInsights, setLoading, setError } = useAmbientPanelSafe();

  const isIntelligent = data.type === "intelligent";
  const intelligentData = isIntelligent ? (data as IntelligentPanelData) : null;

  return {
    isIntelligent,
    pageType: intelligentData?.pageType ?? null,
    pageConfig: intelligentData?.pageConfig ?? null,
    context: intelligentData?.context ?? {},
    insights: intelligentData?.insights ?? [],
    loading: intelligentData?.loading ?? false,
    error: intelligentData?.error ?? null,
    lastRefreshed: intelligentData?.lastRefreshed ?? null,
    setInsights,
    setLoading,
    setError,
  };
}

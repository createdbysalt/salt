"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/**
 * Ambient Panel Context Types
 *
 * The ambient panel shows contextual insights based on the current view.
 * Pages can set their own metrics, alerts, and quick actions.
 */

export type AmbientPanelContextType =
  | "default" // Default studio overview
  | "clients-list" // Client portfolio view
  | "client-detail" // Individual client view
  | "projects-list" // Projects overview
  | "project-detail"; // Individual project view

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

export type AmbientPanelData =
  | { type: "default" }
  | ClientsListAmbientData
  | ClientDetailAmbientData;

interface AmbientPanelContextValue {
  data: AmbientPanelData;
  setData: (data: AmbientPanelData) => void;
  resetToDefault: () => void;
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

  return (
    <AmbientPanelContext.Provider value={{ data, setData, resetToDefault }}>
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
    };
  }
  return context;
}

"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  useAmbientPanelSafe,
  type ClientsListAmbientData,
  type ClientDetailAmbientData,
} from "@/app/_features/shell/contexts/AmbientPanelContext";

/**
 * Hook to set ambient panel data for clients list view
 *
 * Calculates portfolio-level metrics from the client list and
 * sets the ambient panel context automatically.
 */
export function useClientsListAmbientPanel(
  clients: Array<{
    id: string;
    name: string;
    mrr: number;
    healthScore: number;
    lifecycleStage?: string;
    lastContactAt?: string | null;
  }>
) {
  const { setData, resetToDefault } = useAmbientPanelSafe();
  const hasSetRef = useRef(false);

  // Create a stable key from the clients array to detect changes
  const clientsKey = useMemo(() => {
    return clients
      .map((c) => `${c.id}-${c.mrr}-${c.healthScore}-${c.lifecycleStage}`)
      .join("|");
  }, [clients]);

  // Memoize the calculated data
  const ambientData = useMemo((): ClientsListAmbientData => {
    // Calculate metrics
    const totalClients = clients.length;
    const activeClients = clients.filter(
      (c) => c.lifecycleStage === "client"
    ).length;
    const totalMRR = clients.reduce((sum, c) => sum + (c.mrr || 0), 0);
    const avgHealthScore =
      totalClients > 0
        ? Math.round(
            clients.reduce((sum, c) => sum + (c.healthScore || 0), 0) /
              totalClients
          )
        : 0;

    // Calculate stage distribution
    const stageDistribution: Record<string, number> = {
      lead: 0,
      discovery: 0,
      pitch: 0,
      client: 0,
      complete: 0,
    };
    clients.forEach((c) => {
      const stage = c.lifecycleStage || "lead";
      if (stage in stageDistribution) {
        stageDistribution[stage]++;
      }
    });

    // Identify clients needing attention
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const needsAttention = clients
      .filter((c) => {
        // Low health score
        if (c.healthScore < 60) return true;
        // No contact in 30+ days for clients in "client" stage
        if (
          c.lifecycleStage === "client" &&
          c.lastContactAt &&
          new Date(c.lastContactAt) < thirtyDaysAgo
        )
          return true;
        return false;
      })
      .map((c) => ({
        clientId: c.id,
        clientName: c.name,
        reason:
          c.healthScore < 60
            ? `Health score: ${c.healthScore}%`
            : "No contact in 30+ days",
        severity: c.healthScore < 40 ? ("high" as const) : ("medium" as const),
      }))
      .slice(0, 5);

    return {
      type: "clients-list",
      metrics: {
        totalClients,
        activeClients,
        totalMRR,
        mrrChange: 0, // Would need historical data to calculate
        avgHealthScore,
      },
      needsAttention,
      stageDistribution,
    };
  }, [clients]);

  useEffect(() => {
    // Set data on mount and when clientsKey changes
    setData(ambientData);
    hasSetRef.current = true;

    // Reset to default when unmounting
    return () => {
      resetToDefault();
    };
    // Only depend on clientsKey to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientsKey]);
}

/**
 * Hook to set ambient panel data for client detail view
 */
export function useClientDetailAmbientPanel(
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
  },
  upcomingMeetings: Array<{
    id: string;
    title: string;
    date: Date;
  }>,
  recentActivity: Array<{
    id: string;
    type: "message" | "invoice" | "meeting" | "file" | "project";
    description: string;
    timestamp: Date;
    href?: string;
  }>
) {
  const { setData, resetToDefault } = useAmbientPanelSafe();

  // Create stable keys for dependencies
  const clientKey = `${client.id}-${client.healthScore}-${client.ltv}-${client.mrr}`;
  const meetingsKey = upcomingMeetings.map((m) => m.id).join("|");
  const activityKey = recentActivity.map((a) => a.id).join("|");

  // Memoize the data
  const ambientData = useMemo((): ClientDetailAmbientData => ({
    type: "client-detail",
    client,
    upcomingMeetings,
    recentActivity,
  }), [client, upcomingMeetings, recentActivity]);

  useEffect(() => {
    setData(ambientData);

    // Reset to default when unmounting
    return () => {
      resetToDefault();
    };
    // Only depend on keys to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientKey, meetingsKey, activityKey]);
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/libs/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

interface UseSeoAlertCountOptions {
  /** Studio ID (required) */
  studioId: string;
  /** Polling interval in milliseconds (default: 60000 = 60 seconds) */
  pollingInterval?: number;
  /** Whether to enable the hook (default: true) */
  enabled?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to fetch and maintain SEO alert count for the sidebar badge.
 * Polls every 60 seconds by default and subscribes to real-time updates.
 */
export function useSeoAlertCount({
  studioId,
  pollingInterval = 60000,
  enabled = true,
}: UseSeoAlertCountOptions) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch alert count from the database
  const fetchCount = useCallback(async () => {
    if (!enabled || !studioId) return;

    const supabase = supabaseRef.current;

    try {
      const { count: alertCount, error } = await supabase
        .from("seo_alerts")
        .select("id", { count: "exact", head: true })
        .eq("studio_id", studioId)
        .eq("is_dismissed", false);

      if (error) {
        console.error("[useSeoAlertCount] Error fetching count:", error);
        return;
      }

      setCount(alertCount ?? 0);
    } catch (error) {
      console.error("[useSeoAlertCount] Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [studioId, enabled]);

  // Set up polling
  useEffect(() => {
    if (!enabled || !studioId) return;

    // Initial fetch
    fetchCount();

    // Set up polling interval
    const poll = () => {
      pollTimeoutRef.current = setTimeout(() => {
        fetchCount();
        poll();
      }, pollingInterval);
    };
    poll();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [fetchCount, pollingInterval, enabled, studioId]);

  // Set up real-time subscription for immediate updates
  useEffect(() => {
    if (!enabled || !studioId) return;

    const supabase = supabaseRef.current;
    const channelName = `seo-alerts:studio:${studioId}`;

    // Subscribe to changes on seo_alerts table
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "seo_alerts",
        },
        () => {
          // Refetch count when a new alert is inserted
          fetchCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "seo_alerts",
        },
        () => {
          // Refetch count when an alert is updated (e.g., dismissed)
          fetchCount();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioId, enabled, fetchCount]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    /** Total undismissed alert count */
    alertCount: count,
    /** Whether the initial fetch is still loading */
    isLoading,
    /** Manually refresh the count */
    refresh,
  };
}

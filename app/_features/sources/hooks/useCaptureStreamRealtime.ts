"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/app/_lib/supabase/client";

interface UseCaptureStreamRealtimeOptions {
  workspaceId: string | null;
  enabled?: boolean;
  /** Called (debounced) when a capture row changes. */
  onChange?: () => void;
  /** Trailing debounce window — a backfill burst collapses to one refresh. */
  debounceMs?: number;
}

/**
 * Real-time freshness for Sources → Activity: subscribes to capture_events
 * inserts/updates for the workspace and asks the tab cache to revalidate.
 * Debounced trailing-edge so a Gmail backfill (hundreds of rows) triggers
 * one refresh, not hundreds.
 */
export function useCaptureStreamRealtime({
  workspaceId,
  enabled = true,
  onChange,
  debounceMs = 2000,
}: UseCaptureStreamRealtimeOptions) {
  const supabaseRef = useRef(createClient());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !workspaceId) return;

    const supabase = supabaseRef.current;
    const channelName = `capture_events:${workspaceId}`;

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onChangeRef.current?.();
      }, debounceMs);
    };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "capture_events",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "capture_events",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, enabled, debounceMs]);
}

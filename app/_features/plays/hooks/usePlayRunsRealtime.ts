"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/app/_lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface PlayRunChange {
  id: string;
  state: string;
  workspace_id: string;
}

interface UsePlayRunsRealtimeOptions {
  workspaceId: string | null;
  enabled?: boolean;
  onInsert?: (payload: PlayRunChange) => void;
  onUpdate?: (payload: PlayRunChange) => void;
  onDelete?: (payload: { id: string }) => void;
}

export function usePlayRunsRealtime({
  workspaceId,
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
}: UsePlayRunsRealtimeOptions) {
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!enabled || !workspaceId) return;

    const supabase = supabaseRef.current;
    const channelName = `play_runs:${workspaceId}`;

    const channel = supabase
      .channel(channelName)
      .on<PlayRunChange>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "play_runs",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<PlayRunChange>) => {
          if (payload.new && "id" in payload.new) {
            onInsert?.(payload.new as PlayRunChange);
          }
        },
      )
      .on<PlayRunChange>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "play_runs",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<PlayRunChange>) => {
          const newRecord = payload.new as PlayRunChange | undefined;
          const oldRecord = payload.old as { id?: string; state?: string } | undefined;

          if (!newRecord?.id) return;

          // Check if state changed to 'ran' (approved elsewhere)
          if (oldRecord?.state !== "ran" && newRecord.state === "ran") {
            toast.info("Handled on another device", {
              description: "A play was approved elsewhere",
            });
          }

          onUpdate?.(newRecord);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "play_runs",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ id: string }>) => {
          if (payload.old && "id" in payload.old) {
            onDelete?.({ id: payload.old.id as string });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, enabled, onInsert, onUpdate, onDelete]);
}

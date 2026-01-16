"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/app/_lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

interface ConversationUpdatePayload {
  id: string;
  studio_id: string;
  client_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationUpdate {
  id: string;
  studioId: string;
  clientId: string;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  updatedAt: Date;
}

interface UseRealtimeConversationsOptions {
  /** Filter by studio_id for studio users */
  studioId?: string;
  /** Filter by client_id for client users */
  clientId?: string;
  /** Callback when a conversation is updated (new message received) */
  onConversationUpdate: (update: ConversationUpdate) => void;
  /** Whether the subscription is enabled */
  enabled?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Subscribe to real-time conversation updates.
 * Uses Supabase Realtime to receive UPDATE events on the conversations table.
 * This triggers when last_message_at or last_message_preview changes.
 */
export function useRealtimeConversations({
  studioId,
  clientId,
  onConversationUpdate,
  enabled = true,
}: UseRealtimeConversationsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  // Stable callback reference
  const onConversationUpdateRef = useRef(onConversationUpdate);
  useEffect(() => {
    onConversationUpdateRef.current = onConversationUpdate;
  }, [onConversationUpdate]);

  useEffect(() => {
    if (!enabled || (!studioId && !clientId)) {
      return;
    }

    const supabase = supabaseRef.current;
    const filterField = studioId ? "studio_id" : "client_id";
    const filterValue = studioId || clientId;
    const channelName = `conversations:${filterField}:${filterValue}`;

    // Subscribe to UPDATE events on conversations table
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `${filterField}=eq.${filterValue}`,
        },
        (payload) => {
          const updatedRecord = payload.new as ConversationUpdatePayload;

          const update: ConversationUpdate = {
            id: updatedRecord.id,
            studioId: updatedRecord.studio_id,
            clientId: updatedRecord.client_id,
            lastMessageAt: updatedRecord.last_message_at
              ? new Date(updatedRecord.last_message_at)
              : null,
            lastMessagePreview: updatedRecord.last_message_preview,
            updatedAt: new Date(updatedRecord.updated_at),
          };

          onConversationUpdateRef.current(update);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Subscribed to conversations for ${filterField}=${filterValue}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[Realtime] Error subscribing to conversations for ${filterField}=${filterValue}`);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or when filter changes
    return () => {
      if (channelRef.current) {
        console.log(`[Realtime] Unsubscribing from conversations for ${filterField}=${filterValue}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioId, clientId, enabled]);

  return {
    unsubscribe: useCallback(() => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }, []),
  };
}

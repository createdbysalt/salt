"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/libs/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export interface UnreadCounts {
  total: number;
  byConversation: Record<string, number>;
}

interface UseUnreadCountOptions {
  /** Type of user: 'studio' for dashboard, 'client' for Bridge */
  userType: "studio" | "client";
  /** Studio ID (required for studio users) */
  studioId?: string;
  /** Client ID (required for client users) */
  clientId?: string;
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  pollingInterval?: number;
  /** Whether to enable the hook (default: true) */
  enabled?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to fetch and maintain unread message counts.
 * Polls every 30 seconds by default and subscribes to real-time updates.
 * Provides total unread count and counts by conversation.
 */
export function useUnreadCount({
  userType,
  studioId,
  clientId,
  pollingInterval = 30000,
  enabled = true,
}: UseUnreadCountOptions) {
  const [counts, setCounts] = useState<UnreadCounts>({ total: 0, byConversation: {} });
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch unread counts from the database
  const fetchCounts = useCallback(async () => {
    if (!enabled) return;

    const supabase = supabaseRef.current;

    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let conversationIds: string[] = [];

      // Get conversations based on user type
      if (userType === "studio" && studioId) {
        const { data: conversations } = await supabase
          .from("conversations")
          .select("id")
          .eq("studio_id", studioId);
        conversationIds = conversations?.map((c) => c.id) || [];
      } else if (userType === "client" && clientId) {
        const { data: conversations } = await supabase
          .from("conversations")
          .select("id")
          .eq("client_id", clientId);
        conversationIds = conversations?.map((c) => c.id) || [];
      }

      if (conversationIds.length === 0) {
        setCounts({ total: 0, byConversation: {} });
        setIsLoading(false);
        return;
      }

      // Get unread messages (not sent by current user, not yet read)
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id")
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .is("read_at", null);

      if (error) {
        console.error("[useUnreadCount] Error fetching unread counts:", error);
        return;
      }

      // Count by conversation
      const byConversation: Record<string, number> = {};
      let total = 0;

      for (const message of data || []) {
        const convId = message.conversation_id;
        byConversation[convId] = (byConversation[convId] || 0) + 1;
        total++;
      }

      setCounts({ total, byConversation });
    } catch (error) {
      console.error("[useUnreadCount] Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userType, studioId, clientId, enabled]);

  // Set up polling
  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchCounts();

    // Set up polling interval
    const poll = () => {
      pollTimeoutRef.current = setTimeout(() => {
        fetchCounts();
        poll();
      }, pollingInterval);
    };
    poll();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [fetchCounts, pollingInterval, enabled]);

  // Set up real-time subscription for immediate updates
  useEffect(() => {
    if (!enabled) return;

    const supabase = supabaseRef.current;
    const channelName = userType === "studio"
      ? `unread:studio:${studioId}`
      : `unread:client:${clientId}`;

    // Subscribe to INSERT events on messages table
    // We'll refetch counts on any message insert to keep it simple and accurate
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          // Refetch counts when a new message is inserted
          fetchCounts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        () => {
          // Refetch counts when a message is updated (e.g., marked as read)
          fetchCounts();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[useUnreadCount] Subscribed to realtime updates for ${userType}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userType, studioId, clientId, enabled, fetchCounts]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchCounts();
  }, [fetchCounts]);

  return {
    /** Total unread message count */
    totalUnread: counts.total,
    /** Unread counts by conversation ID */
    byConversation: counts.byConversation,
    /** Whether the initial fetch is still loading */
    isLoading,
    /** Manually refresh the counts */
    refresh,
  };
}

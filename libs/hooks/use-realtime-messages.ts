"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/libs/supabase/client";
import type { Message, SenderType } from "@/app/actions/messaging/message-actions";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

interface RealtimeMessagePayload {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: SenderType;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface UseRealtimeMessagesOptions {
  conversationId: string;
  onNewMessage: (message: Message) => void;
  enabled?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Subscribe to real-time message updates for a conversation.
 * Uses Supabase Realtime to receive INSERT events on the messages table.
 */
export function useRealtimeMessages({
  conversationId,
  onNewMessage,
  enabled = true,
}: UseRealtimeMessagesOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  // Stable callback reference
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  // Fetch sender profile info
  const fetchSenderProfile = useCallback(
    async (senderId: string): Promise<{ name: string; avatarUrl?: string }> => {
      const { data } = await supabaseRef.current
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", senderId)
        .single();

      return {
        name: data?.full_name || "Unknown",
        avatarUrl: data?.avatar_url,
      };
    },
    []
  );

  useEffect(() => {
    if (!enabled || !conversationId) {
      return;
    }

    const supabase = supabaseRef.current;
    const channelName = `messages:conversation:${conversationId}`;

    // Subscribe to INSERT events on messages table filtered by conversation_id
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newRecord = payload.new as RealtimeMessagePayload;

          // Fetch sender profile to get name and avatar
          const senderProfile = await fetchSenderProfile(newRecord.sender_id);

          const message: Message = {
            id: newRecord.id,
            conversationId: newRecord.conversation_id,
            senderId: newRecord.sender_id,
            senderType: newRecord.sender_type,
            senderName: senderProfile.name,
            senderAvatarUrl: senderProfile.avatarUrl,
            content: newRecord.content,
            readAt: newRecord.read_at ? new Date(newRecord.read_at) : null,
            createdAt: new Date(newRecord.created_at),
          };

          onNewMessageRef.current(message);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Subscribed to messages for conversation ${conversationId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[Realtime] Error subscribing to messages for conversation ${conversationId}`);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or when conversationId changes
    return () => {
      if (channelRef.current) {
        console.log(`[Realtime] Unsubscribing from messages for conversation ${conversationId}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, enabled, fetchSenderProfile]);

  return {
    unsubscribe: useCallback(() => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }, []),
  };
}

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@repo/utils";
import type { ClientConversation } from "@/app/actions/messaging/conversation-actions";
import type { Message } from "@/app/actions/messaging/message-actions";
import type { UnreadCounts } from "@/app/actions/messaging/unread-actions";
import { getMessages, sendMessage, markMessagesAsRead } from "@/app/actions/messaging/message-actions";
import { useRealtimeMessages } from "@/app/_features/messaging/hooks";
import { ConversationList } from "@/app/_features/bridge-messaging/components/ConversationList";
import { MessageThread } from "@/app/_features/bridge-messaging/components/MessageThread";
import { MessageEmpty } from "@/app/_features/bridge-messaging/components/MessageEmpty";

interface BridgeMessagesClientProps {
  initialConversations: ClientConversation[];
  initialUnreadCounts: UnreadCounts;
  initialConversationId?: string;
}

export function BridgeMessagesClient({
  initialConversations,
  initialUnreadCounts,
  initialConversationId,
}: BridgeMessagesClientProps) {
  const router = useRouter();

  // State
  const [conversations] = useState<ClientConversation[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversationId || (initialConversations[0]?.id ?? null)
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>(initialUnreadCounts);
  const [isSending, setIsSending] = useState(false);

  // Get selected conversation
  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  // Load messages when conversation changes
  useEffect(() => {
    async function loadMessages() {
      if (!selectedConversationId) {
        setMessages([]);
        return;
      }

      setIsLoadingMessages(true);
      try {
        const result = await getMessages({ conversationId: selectedConversationId });
        if (result && "success" in result && result.success) {
          // Reverse to show oldest first (API returns newest first)
          setMessages(result.data.messages.reverse());

          // Mark messages as read
          await markMessagesAsRead({ conversationId: selectedConversationId });

          // Update unread counts locally
          setUnreadCounts((prev) => ({
            total: Math.max(0, prev.total - (prev.byConversation[selectedConversationId] || 0)),
            byConversation: {
              ...prev.byConversation,
              [selectedConversationId]: 0,
            },
          }));
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    }

    loadMessages();
  }, [selectedConversationId]);

  // Handle new realtime message
  const handleNewMessage = useCallback(
    (message: Message) => {
      // Add message if it's for the current conversation and not a duplicate
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      // If this is from someone else, increment unread (unless we're viewing)
      if (message.senderId !== selectedConversationId) {
        // Mark as read immediately since user is viewing
        markMessagesAsRead({ conversationId: message.conversationId });
      }
    },
    [selectedConversationId]
  );

  // Subscribe to realtime messages
  useRealtimeMessages({
    conversationId: selectedConversationId || "",
    onNewMessage: handleNewMessage,
    enabled: !!selectedConversationId,
  });

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);
      // Update URL without full navigation (for deep linking)
      router.push(`/bridge/messages/${conversationId}`, { scroll: false });
    },
    [router]
  );

  // Handle back to list (mobile)
  const handleBackToList = useCallback(() => {
    setSelectedConversationId(null);
    router.push("/bridge/messages", { scroll: false });
  }, [router]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedConversationId || !content.trim()) return;

      setIsSending(true);
      try {
        const result = await sendMessage({
          conversationId: selectedConversationId,
          content: content.trim(),
        });

        if (result && "success" in result && result.success) {
          // Add optimistically (realtime will also deliver, but dedup handles it)
          setMessages((prev) => {
            if (prev.some((m) => m.id === result.data.id)) {
              return prev;
            }
            return [...prev, result.data];
          });
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setIsSending(false);
      }
    },
    [selectedConversationId]
  );

  // Empty state when no conversations
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center h-[calc(100vh-var(--header-height)-var(--spacing)*8)]">
        <MessageEmpty variant="no-conversations" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-[calc(100vh-var(--header-height)-var(--spacing)*8)]">
      {/* Conversation List - hidden when thread selected on mobile */}
      <div
        className={cn(
          "w-full md:w-[320px] shrink-0 border-r flex flex-col",
          selectedConversationId && "hidden md:flex"
        )}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          unreadCounts={unreadCounts.byConversation}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Message Thread - full width on mobile, flex-1 on desktop */}
      <div
        className={cn(
          "flex-1 flex flex-col",
          !selectedConversationId && "hidden md:flex"
        )}
      >
        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            messages={messages}
            isLoading={isLoadingMessages}
            isSending={isSending}
            onSendMessage={handleSendMessage}
            onBack={handleBackToList}
          />
        ) : (
          <MessageEmpty variant="select-conversation" />
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageComposer } from "@/components/messaging/MessageComposer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sendMessage, getMessages } from "@/app/_features/messaging/actions";
import type { ClientConversation, Message } from "@/app/_features/messaging/types";

// ============================================================================
// Types
// ============================================================================

interface BridgeConversationDetailClientProps {
  conversation: ClientConversation;
  initialMessages: Message[];
  initialHasMore: boolean;
  initialCursor: string | null;
  currentUserId: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function BridgeConversationDetailClient({
  conversation,
  initialMessages,
  initialHasMore,
  initialCursor,
  currentUserId,
}: BridgeConversationDetailClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const result = await getMessages({
        conversationId: conversation.id,
        cursor: nextCursor,
      });

      if ("data" in result) {
        const data = result.data;
        setMessages((prev) => [...prev, ...data.messages]);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversation.id, nextCursor, isLoadingMore]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (content: string): Promise<{ error?: string } | void> => {
      const result = await sendMessage({
        conversationId: conversation.id,
        content,
      });

      if ("data" in result) {
        // Add message to list
        setMessages((prev) => [result.data, ...prev]);
        router.refresh();
      } else {
        return { error: result.error };
      }
    },
    [conversation.id, router]
  );

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push("/bridge/messages");
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back to messages</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {conversation.studioName}
          </h1>
          <p className="text-sm text-muted-foreground">Conversation</p>
        </div>
      </div>

      {/* Conversation thread */}
      <Card className="flex flex-col h-[calc(100vh-280px)] min-h-[500px] overflow-hidden">
        <CardContent className="flex flex-col flex-1 overflow-hidden p-0">
          {/* Messages */}
          <MessageThread
            messages={messages}
            currentUserId={currentUserId}
            isLoading={false}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            className="flex-1"
          />

          {/* Composer */}
          <div className="border-t border-border p-4">
            <MessageComposer onSend={handleSendMessage} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

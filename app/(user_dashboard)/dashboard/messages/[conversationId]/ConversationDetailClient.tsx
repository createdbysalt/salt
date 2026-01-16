"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageComposer } from "@/components/messaging/MessageComposer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sendMessage, getMessages } from "@/app/_features/messaging/actions";
import type { Conversation, ClientConversation, Message } from "@/app/_features/messaging/types";

// ============================================================================
// Types
// ============================================================================

interface ConversationDetailClientProps {
  conversation: Conversation | ClientConversation;
  initialMessages: Message[];
  initialHasMore: boolean;
  initialCursor: string | null;
  currentUserId: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function ConversationDetailClient({
  conversation,
  initialMessages,
  initialHasMore,
  initialCursor,
  currentUserId,
}: ConversationDetailClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Get display name - clientName for dashboard, studioName for bridge
  const displayName =
    "clientName" in conversation
      ? conversation.clientName
      : conversation.studioName;

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
        setMessages((prev) => [...prev, ...result.data.messages]);
        setNextCursor(result.data.nextCursor);
        setHasMore(result.data.hasMore);
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
        // Add message to list (at the beginning since we display newest first)
        setMessages((prev) => [result.data, ...prev]);
        router.refresh();
      } else {
        return { error: result.error };
      }
    },
    [conversation.id, router]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/messages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-light tracking-tight">{displayName}</h1>
          <p className="text-sm text-muted-foreground">Conversation</p>
        </div>
      </div>

      {/* Thread */}
      <Card className="h-[calc(100vh-220px)] min-h-[500px] flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          {/* Messages */}
          <MessageThread
            messages={messages}
            currentUserId={currentUserId}
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

"use client";

import { useState, useMemo } from "react";
import { Input } from "@repo/ui";
import { Search } from "lucide-react";
import type { ClientConversation } from "@/app/actions/messaging/conversation-actions";
import { ConversationItem } from "./ConversationItem";

interface ConversationListProps {
  conversations: ClientConversation[];
  selectedId: string | null;
  unreadCounts: Record<string, number>;
  onSelect: (conversationId: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  unreadCounts,
  onSelect,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }

    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.studioName.toLowerCase().includes(query) ||
        conv.lastMessagePreview?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-4 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedId}
                unreadCount={unreadCounts[conversation.id] || 0}
                onClick={() => onSelect(conversation.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

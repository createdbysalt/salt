"use client";

import * as React from "react";
import { Search, MoreHorizontal, PenSquare, MessageSquare } from "lucide-react";
import { cn } from "@repo/utils";
import {
  Input,
  Button,
  Separator,
  Skeleton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@repo/ui";
import { ConversationListItem, type Conversation } from "./ConversationListItem";

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect?: (conversation: Conversation) => void;
  onNewConversation?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ConversationSidebar({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
  isLoading = false,
  className,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter conversations by search
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.name.toLowerCase().includes(query) ||
        conv.lastMessagePreview?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-r",
        className
      )}
    >
      {/* Header */}
      <div className="shrink-0 p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Mark all as read</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {onNewConversation && (
              <Button variant="ghost" size="icon" className="size-8" onClick={onNewConversation}>
                <PenSquare className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Separator />

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
            {conversations.length === 0 ? (
              <>
                <MessageSquare className="size-8 text-muted-foreground/50" />
                <span>No conversations yet</span>
              </>
            ) : (
              <>
                <Search className="size-8 text-muted-foreground/50" />
                <span>No matching conversations</span>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                onClick={() => onSelect?.(conversation)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

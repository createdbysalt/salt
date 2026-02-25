"use client";

import * as React from "react";
import { MoreHorizontal, MessageSquare, Users } from "lucide-react";
import { cn } from "@repo/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@repo/ui";
import { ChatThread } from "./ChatThread";
import type { ChatMessageData } from "./ChatMessage";
import { ChatComposer } from "./ChatComposer";
import type { Conversation } from "./ConversationListItem";

interface ConversationPanelProps {
  conversation: Conversation;
  messages: ChatMessageData[];
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onSendMessage: (content: string) => Promise<{ error?: string } | void>;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ConversationPanel({
  conversation,
  messages,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onSendMessage,
  className,
}: ConversationPanelProps) {
  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={conversation.avatarUrl} alt={conversation.name} />
            <AvatarFallback>{getInitials(conversation.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{conversation.name}</h2>
            {conversation.memberCount && conversation.memberCount > 1 && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="size-3" />
                {conversation.memberCount} members
              </p>
            )}
            {conversation.type === "direct" && (
              <p className="text-sm text-muted-foreground">Direct message</p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View members</DropdownMenuItem>
            <DropdownMenuItem>Mute conversation</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Message Thread */}
      <ChatThread
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        className="flex-1"
      />

      {/* Composer */}
      <ChatComposer
        onSend={onSendMessage}
        placeholder={conversation.type === "general" ? "Group message" : `Message ${conversation.name}`}
      />
    </div>
  );
}

// Empty state when no conversation is selected
export function ConversationPanelEmpty({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col h-full bg-background items-center justify-center", className)}>
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">Select a conversation</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a conversation from the sidebar to start messaging.
      </p>
    </div>
  );
}

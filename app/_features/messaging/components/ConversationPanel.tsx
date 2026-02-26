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
import { SmartComposer, type MessageMode, type ContactCapabilities } from "./SmartComposer";
import { EmptyConversation } from "./EmptyConversation";
import type { Conversation } from "./ConversationListItem";
import type { GmailAccount } from "./EmailFields";

interface ConversationPanelProps {
  conversation: Conversation;
  messages: ChatMessageData[];
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onSendMessage: (data: {
    content: string;
    mode: MessageMode;
    attachments?: File[];
    emailData?: {
      fromAccountId: string;
      recipientIds: string[];
      subject: string;
    };
  }) => Promise<{ error?: string } | void>;
  // Smart composer props
  contact?: ContactCapabilities;
  contacts?: (ContactCapabilities & { id: string; name: string })[];
  gmailConnected?: boolean;
  gmailAccounts?: GmailAccount[];
  onConnectGmail?: () => void;
  onInviteToBridge?: () => void;
  onAddEmail?: () => void;
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

// Stacked avatars for group conversations (larger version for header)
function StackedAvatarsLarge({ members, max = 3 }: { members: { name: string; avatarUrl?: string }[]; max?: number }) {
  const displayMembers = members.slice(0, max);
  const remaining = members.length - max;

  if (displayMembers.length === 0) {
    return (
      <div className="size-12 rounded-full bg-muted flex items-center justify-center">
        <Users className="size-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative size-12 shrink-0">
      {displayMembers.map((member, index) => (
        <Avatar
          key={index}
          className={cn(
            "absolute border-2 border-background",
            index === 0 && "size-8 top-0 left-0 z-30",
            index === 1 && "size-8 top-0 right-0 z-20",
            index === 2 && "size-7 bottom-0 left-1/2 -translate-x-1/2 z-10"
          )}
        >
          <AvatarImage src={member.avatarUrl} alt={member.name} />
          <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <div className="absolute bottom-0 right-0 size-6 rounded-full bg-muted border-2 border-background flex items-center justify-center z-40">
          <span className="text-[10px] font-medium text-muted-foreground">+{remaining}</span>
        </div>
      )}
    </div>
  );
}

export function ConversationPanel({
  conversation,
  messages,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onSendMessage,
  contact,
  contacts,
  gmailConnected = false,
  gmailAccounts = [],
  onConnectGmail,
  onInviteToBridge,
  onAddEmail,
  className,
}: ConversationPanelProps) {
  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          {/* Stacked avatars for General, single avatar for DMs */}
          {conversation.type === "general" && conversation.members ? (
            <StackedAvatarsLarge members={conversation.members} max={3} />
          ) : (
            <Avatar className="size-10">
              <AvatarImage src={conversation.avatarUrl} alt={conversation.name} />
              <AvatarFallback>{getInitials(conversation.name)}</AvatarFallback>
            </Avatar>
          )}
          <div>
            <h2 className="font-semibold">{conversation.name}</h2>
            {conversation.type === "general" && conversation.members && (
              <p className="text-sm text-muted-foreground">
                {conversation.members.length} {conversation.members.length === 1 ? "member" : "members"}
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

      {/* Message Thread or Empty State */}
      {isEmpty ? (
        <EmptyConversation
          conversationType={conversation.type}
          clientName={conversation.name}
          contact={contact}
          gmailConnected={gmailConnected}
          onInviteToBridge={onInviteToBridge}
          onConnectGmail={onConnectGmail}
          className="flex-1"
        />
      ) : (
        <ChatThread
          messages={messages}
          isLoading={isLoading}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          className="flex-1"
        />
      )}

      {/* Smart Composer */}
      <SmartComposer
        conversationType={conversation.type}
        contact={contact}
        contacts={contacts}
        gmailConnected={gmailConnected}
        gmailAccounts={gmailAccounts}
        onSend={onSendMessage}
        onConnectGmail={onConnectGmail}
        onInviteToBridge={onInviteToBridge}
        onAddEmail={onAddEmail}
        placeholder={
          conversation.type === "general"
            ? "Message everyone..."
            : `Message ${conversation.name}...`
        }
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

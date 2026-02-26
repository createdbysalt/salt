"use client";

import * as React from "react";
import { MoreHorizontal, MessageSquare, Users, Trash2, UserPen } from "lucide-react";
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
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui";
import { ChatThread } from "./ChatThread";
import type { ChatMessageData } from "./ChatMessage";
import { SmartComposer, type MessageMode, type ContactCapabilities, type ReplyContext, type EmailThread } from "./SmartComposer";
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
      replyToThreadId?: string;
    };
  }) => Promise<{ error?: string } | void>;
  onDeleteMessage?: (messageId: string, deleteForEveryone: boolean) => void;
  // Smart composer props
  contact?: ContactCapabilities;
  contacts?: (ContactCapabilities & { id: string; name: string })[];
  gmailConnected?: boolean;
  gmailAccounts?: GmailAccount[];
  onConnectGmail?: () => void;
  onInviteToBridge?: () => void;
  onAddEmail?: () => void;
  // Action callbacks
  onClearChat?: () => void;
  onEditContact?: () => void;
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
  onDeleteMessage,
  contact,
  contacts,
  gmailConnected = false,
  gmailAccounts = [],
  onConnectGmail,
  onInviteToBridge,
  onAddEmail,
  onClearChat,
  onEditContact,
  className,
}: ConversationPanelProps) {
  const isEmpty = messages.length === 0 && !isLoading;
  const [showMembersDialog, setShowMembersDialog] = React.useState(false);

  // Extract available threads from email messages (last 7 days, unique by threadId)
  // Works for both DM and General conversations
  const availableThreads: EmailThread[] = React.useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get emails with thread IDs from last 7 days
    const recentEmails = messages.filter(
      (m) =>
        m.channel === "email" &&
        m.gmailThreadId &&
        m.emailSubject &&
        m.createdAt >= sevenDaysAgo
    );

    // Group by thread ID and get the most recent subject/date for each
    const threadMap = new Map<string, EmailThread>();
    for (const email of recentEmails) {
      const existing = threadMap.get(email.gmailThreadId!);
      if (!existing || email.createdAt > existing.lastMessageAt) {
        // Normalize subject (remove Re: prefix for display)
        const subject = email.emailSubject!.replace(/^Re:\s*/i, "").trim();
        threadMap.set(email.gmailThreadId!, {
          threadId: email.gmailThreadId!,
          subject,
          lastMessageAt: email.createdAt,
        });
      }
    }

    // Convert to array and sort by most recent
    return Array.from(threadMap.values()).sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );
  }, [messages]);

  // Legacy reply context (for backwards compatibility)
  const replyContext: ReplyContext | undefined = React.useMemo(() => {
    if (availableThreads.length > 0) {
      return {
        subject: availableThreads[0].subject,
        threadId: availableThreads[0].threadId,
      };
    }
    return undefined;
  }, [availableThreads]);

  return (
    <div className={cn("flex flex-col h-full bg-background overflow-hidden", className)}>
      {/* Header */}
      <div className="shrink-0 h-[60px] flex items-center justify-between px-4 border-b">
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
                {conversation.members.length + 1} {conversation.members.length + 1 === 1 ? "member" : "members"}
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
            {conversation.type === "general" ? (
              <>
                <DropdownMenuItem onClick={() => setShowMembersDialog(true)}>
                  <Users className="size-4 mr-2" />
                  View members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onClearChat}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2" />
                  Clear chat
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={onEditContact}>
                  <UserPen className="size-4 mr-2" />
                  Edit contact
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onClearChat}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2" />
                  Clear chat
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Message Thread or Empty State - min-h-0 is critical for flex scroll */}
      {isEmpty ? (
        <EmptyConversation
          conversationType={conversation.type}
          clientName={conversation.name}
          contact={contact}
          gmailConnected={gmailConnected}
          onInviteToBridge={onInviteToBridge}
          onConnectGmail={onConnectGmail}
          className="flex-1 min-h-0"
        />
      ) : (
        <ChatThread
          messages={messages}
          isLoading={isLoading}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          onDelete={onDeleteMessage}
          className="flex-1 min-h-0"
        />
      )}

      {/* Smart Composer - shrink-0 keeps it fixed at bottom */}
      <div className="shrink-0">
        <SmartComposer
          conversationType={conversation.type}
          contact={contact}
          contacts={contacts}
          gmailConnected={gmailConnected}
          gmailAccounts={gmailAccounts}
          replyContext={replyContext}
          availableThreads={availableThreads}
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

      {/* Members Dialog - for General conversations */}
      {conversation.type === "general" && conversation.members && (
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Group members</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {/* Current user (you) */}
              <div className="flex items-center gap-3 px-1">
                <Avatar className="size-10">
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">You</p>
                  <p className="text-sm text-muted-foreground">Studio owner</p>
                </div>
              </div>
              {/* Other members */}
              {conversation.members.map((member, index) => (
                <div key={index} className="flex items-center gap-3 px-1">
                  <Avatar className="size-10">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.name}</p>
                    <p className="text-sm text-muted-foreground">Member</p>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
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

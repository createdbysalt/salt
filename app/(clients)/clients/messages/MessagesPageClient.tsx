"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search as SearchIcon,
  Settings,
  SlidersHorizontal,
  MessageSquare,
  Eye,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Button,
  Separator,
  SidebarTrigger,
  Skeleton,
} from "@repo/ui";
import { ConversationPanel, ConversationPanelEmpty } from "@/app/_features/messaging/components/ConversationPanel";
import { ConversationListItem } from "@/app/_features/messaging/components/ConversationListItem";
import type { Conversation as ConversationListItemType } from "@/app/_features/messaging/components/ConversationListItem";
import type { ChatMessageData } from "@/app/_features/messaging/components/ChatMessage";
import type { MessageMode, ContactCapabilities } from "@/app/_features/messaging/components/SmartComposer";
import type { GmailAccount } from "@/app/_features/messaging/components/EmailFields";
import type { Conversation } from "@/app/actions/messaging/conversation-actions";
import { getMessages, sendMessage } from "@/app/_features/messaging/actions";

// ============================================================================
// Types
// ============================================================================

interface SendMessageData {
  content: string;
  mode: MessageMode;
  attachments?: Array<{ file: File; existingFileId?: string }>;
  emailData?: {
    fromAccountId: string;
    recipientIds: string[];
    subject: string;
    replyToThreadId?: string;
  };
}

interface MessagesPageClientProps {
  initialConversations: Conversation[];
  gmailConnected?: boolean;
  gmailAccount?: GmailAccount;
}

// ============================================================================
// Component
// ============================================================================

export function MessagesPageClient({
  initialConversations,
  gmailConnected = false,
  gmailAccount,
}: MessagesPageClientProps) {
  const router = useRouter();

  // State
  const [conversations] = React.useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [messages, setMessages] = React.useState<ChatMessageData[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Get selected conversation
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // Filter conversations by search
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.clientName.toLowerCase().includes(query) ||
        conv.lastMessagePreview?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Map server conversations to list item format
  const conversationListItems: ConversationListItemType[] = React.useMemo(() => {
    return filteredConversations.map((conv) => ({
      id: conv.id,
      type: "direct" as const,
      name: conv.clientName,
      avatarUrl: conv.clientAvatarUrl,
      lastMessagePreview: conv.lastMessagePreview,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: 0, // TODO: Add unread count
    }));
  }, [filteredConversations]);

  // Load messages when conversation changes
  React.useEffect(() => {
    async function loadMessages() {
      if (!selectedConversation) {
        setMessages([]);
        return;
      }

      setIsLoadingMessages(true);
      try {
        const result = await getMessages({ conversationId: selectedConversation.id });
        if ("error" in result) {
          console.error("Failed to load messages:", result.error);
          setMessages([]);
        } else {
          // Map to ChatMessageData format - messages are returned in reverse order (newest first)
          const chatMessages: ChatMessageData[] = result.data.messages
            .slice()
            .reverse()
            .map((msg) => ({
              id: msg.id,
              content: msg.content,
              createdAt: new Date(msg.createdAt),
              isFromMe: msg.senderType === "studio_user",
              senderName: msg.senderName,
              senderAvatarUrl: msg.senderAvatarUrl,
              status: "delivered" as const,
              channel: "table" as const,
            }));
          setMessages(chatMessages);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    }

    loadMessages();
  }, [selectedConversation]);

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  // Handle send message
  const handleSendMessage = async (data: SendMessageData): Promise<{ error?: string } | void> => {
    if (!selectedConversation) {
      return { error: "No conversation selected" };
    }

    try {
      const result = await sendMessage({
        conversationId: selectedConversation.id,
        content: data.content,
      });

      if ("error" in result) {
        return { error: result.error };
      }

      // Add the new message to the list
      const newMessage: ChatMessageData = {
        id: result.data.id,
        content: result.data.content,
        createdAt: new Date(result.data.createdAt),
        isFromMe: true,
        senderName: result.data.senderName,
        senderAvatarUrl: result.data.senderAvatarUrl,
        status: "delivered" as const,
        channel: "table" as const,
      };
      setMessages((prev) => [...prev, newMessage]);

      return;
    } catch (error) {
      console.error("Error sending message:", error);
      return { error: "Failed to send message" };
    }
  };

  // Build contact for selected conversation
  const selectedContact: ContactCapabilities | undefined = selectedConversation
    ? {
        hasBridge: true, // Assume bridge for now
        hasEmail: true,
        email: undefined,
      }
    : undefined;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex w-full items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="h-5 w-px bg-border mx-2" />
          <span className="text-2xl font-semibold">messages</span>

          <div className="flex-1" />

          {/* Settings */}
          <Button size="icon" variant="secondary" className="size-8" asChild>
            <Link href="/settings/studio/profile">
              <Settings className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Conversation List */}
        <div className="w-[300px] shrink-0 border-r flex flex-col">
          {/* Search */}
          <div className="shrink-0 h-[60px] flex items-center px-4 border-b">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-md bg-muted/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {conversationListItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <MessageSquare className="size-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                  Start a conversation from a client&apos;s detail page.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversationListItems.map((conversation) => (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Selected Conversation */}
        <div className="flex-1 min-w-0">
          {selectedConversation ? (
            <ConversationPanel
              conversation={{
                id: selectedConversation.id,
                type: "direct",
                name: selectedConversation.clientName,
                avatarUrl: selectedConversation.clientAvatarUrl,
                lastMessagePreview: selectedConversation.lastMessagePreview,
                lastMessageAt: selectedConversation.lastMessageAt,
              }}
              messages={messages}
              isLoading={isLoadingMessages}
              onSendMessage={handleSendMessage}
              clientId={selectedConversation.clientId}
              contact={selectedContact}
              gmailConnected={gmailConnected}
              gmailAccounts={gmailAccount ? [gmailAccount] : []}
              onConnectGmail={() => router.push("/settings?section=integrations")}
              className="h-full"
            />
          ) : (
            <ConversationPanelEmpty className="h-full" />
          )}
        </div>
      </div>
    </div>
  );
}

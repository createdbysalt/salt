"use client";

import { useState, useCallback, useTransition } from "react";
import { MessageSquare, MessageSquarePlus, Loader2 } from "lucide-react";
import { ConversationListItem } from "@/components/messaging/ConversationListItem";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageComposer } from "@/components/messaging/MessageComposer";
import { MessageSearchInput } from "@/components/messaging/MessageSearchInput";
import { MessageSearchResults } from "@/components/messaging/MessageSearchResults";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
} from "@/app/actions/messaging/message-actions";
import { searchClientMessages } from "@/app/actions/messaging/search-actions";
import {
  getOrCreateClientConversation,
  type ClientConversation,
} from "@/app/actions/messaging/conversation-actions";
import {
  useRealtimeMessages,
  useRealtimeConversations,
} from "@/libs/hooks";
import type { ConversationUpdate } from "@/libs/hooks";
import type { Message } from "@/app/actions/messaging/message-actions";
import type { UnreadCounts } from "@/app/actions/messaging/unread-actions";
import type { SearchResult } from "@/app/actions/messaging/search-actions";

// ============================================================================
// Types
// ============================================================================

interface BridgeMessagesPageClientProps {
  conversations: ClientConversation[];
  unreadCounts: UnreadCounts;
  currentUserId: string;
  clientId: string;
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="bg-muted/50 rounded-full p-4 mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No messages yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Your studio team will reach out when they have updates or questions for
        you.
      </p>
    </div>
  );
}

// ============================================================================
// Conversation List Component
// ============================================================================

function ConversationList({
  conversations,
  unreadCounts,
  activeConversationId,
  onSelect,
}: {
  conversations: ClientConversation[];
  unreadCounts: UnreadCounts;
  activeConversationId: string | null;
  onSelect: (conversation: ClientConversation) => void;
}) {
  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {conversations.map((conversation) => (
        <ConversationListItem
          key={conversation.id}
          id={conversation.id}
          name={conversation.studioName}
          avatarUrl={conversation.studioLogoUrl}
          lastMessagePreview={conversation.lastMessagePreview}
          lastMessageAt={conversation.lastMessageAt}
          unreadCount={unreadCounts.byConversation[conversation.id] || 0}
          isActive={conversation.id === activeConversationId}
          onClick={() => onSelect(conversation)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Thread View Component
// ============================================================================

function ThreadView({
  conversation,
  messages,
  isLoading,
  isLoadingMore,
  hasMore,
  currentUserId,
  onLoadMore,
  onSend,
}: {
  conversation: ClientConversation;
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  currentUserId: string;
  onLoadMore: () => void;
  onSend: (content: string) => Promise<{ error?: string } | void>;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header - Shows studio name */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-medium">{conversation.studioName}</h2>
      </div>

      {/* Messages */}
      <MessageThread
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        className="flex-1"
      />

      {/* Composer */}
      <div className="border-t border-border p-4">
        <MessageComposer onSend={onSend} />
      </div>
    </div>
  );
}

// ============================================================================
// Thread Placeholder Component
// ============================================================================

function ThreadPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="bg-muted/50 rounded-full p-4 mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">Select a conversation</h3>
      <p className="text-sm text-muted-foreground">
        Choose a conversation from the list to view messages.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BridgeMessagesPageClient({
  conversations: initialConversations,
  unreadCounts: initialUnreadCounts,
  currentUserId,
  clientId,
}: BridgeMessagesPageClientProps) {
  const [conversations, setConversations] = useState<ClientConversation[]>(initialConversations);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>(initialUnreadCounts);
  const [activeConversation, setActiveConversation] =
    useState<ClientConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [, startTransition] = useTransition();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // New chat state
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // ========================================================================
  // Realtime: Messages
  // ========================================================================

  // Handle new messages received via realtime
  const handleRealtimeMessage = useCallback(
    (newMessage: Message) => {
      // Only add if not sent by current user (we already add those optimistically)
      if (newMessage.senderId !== currentUserId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          // Add to beginning (newest first)
          return [newMessage, ...prev];
        });

        // Update unread count for this conversation
        if (activeConversation?.id === newMessage.conversationId) {
          // Mark as read immediately since user is viewing this conversation
          startTransition(async () => {
            await markMessagesAsRead({ conversationId: newMessage.conversationId });
          });
        } else {
          // Increment unread count
          setUnreadCounts((prev) => ({
            total: prev.total + 1,
            byConversation: {
              ...prev.byConversation,
              [newMessage.conversationId]:
                (prev.byConversation[newMessage.conversationId] || 0) + 1,
            },
          }));
        }
      }
    },
    [currentUserId, activeConversation?.id]
  );

  // Subscribe to realtime messages for the active conversation
  useRealtimeMessages({
    conversationId: activeConversation?.id || "",
    onNewMessage: handleRealtimeMessage,
    enabled: !!activeConversation,
  });

  // ========================================================================
  // Realtime: Conversations
  // ========================================================================

  // Handle conversation updates (new message received)
  const handleConversationUpdate = useCallback(
    (update: ConversationUpdate) => {
      setConversations((prev) => {
        const updatedConversations = prev.map((conv) => {
          if (conv.id === update.id) {
            return {
              ...conv,
              lastMessageAt: update.lastMessageAt,
              lastMessagePreview: update.lastMessagePreview,
              updatedAt: update.updatedAt,
            };
          }
          return conv;
        });

        // Re-sort by last_message_at (newest first)
        return updatedConversations.sort((a, b) => {
          if (!a.lastMessageAt && !b.lastMessageAt) return 0;
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
        });
      });
    },
    []
  );

  // Subscribe to realtime conversation updates (filtered by clientId)
  useRealtimeConversations({
    clientId,
    onConversationUpdate: handleConversationUpdate,
    enabled: true,
  });

  // ========================================================================
  // Message Loading
  // ========================================================================

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (conversationId: string, cursor?: string) => {
      const isInitialLoad = !cursor;

      if (isInitialLoad) {
        setIsLoadingMessages(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await getMessages({ conversationId, cursor });

        if ("data" in result) {
          const data = result.data;
          if (isInitialLoad) {
            setMessages(data.messages);
          } else {
            setMessages((prev) => [...prev, ...data.messages]);
          }
          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
        }
      } finally {
        if (isInitialLoad) {
          setIsLoadingMessages(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    []
  );

  // ========================================================================
  // Event Handlers
  // ========================================================================

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    async (conversation: ClientConversation) => {
      setActiveConversation(conversation);
      setMessages([]);
      setNextCursor(null);
      setHasMore(false);

      // Load messages
      await loadMessages(conversation.id);

      // Mark messages as read
      startTransition(async () => {
        await markMessagesAsRead({ conversationId: conversation.id });
        // Clear unread count for this conversation
        setUnreadCounts((prev) => {
          const conversationUnread = prev.byConversation[conversation.id] || 0;
          return {
            total: Math.max(0, prev.total - conversationUnread),
            byConversation: {
              ...prev.byConversation,
              [conversation.id]: 0,
            },
          };
        });
      });
    },
    [loadMessages]
  );

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (activeConversation && nextCursor && !isLoadingMore) {
      loadMessages(activeConversation.id, nextCursor);
    }
  }, [activeConversation, nextCursor, isLoadingMore, loadMessages]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (content: string): Promise<{ error?: string } | void> => {
      if (!activeConversation) return { error: "No conversation selected" };

      const result = await sendMessage({
        conversationId: activeConversation.id,
        content,
      });

      if ("data" in result) {
        // Add message to list (optimistic update)
        setMessages((prev) => [result.data, ...prev]);
      } else {
        return { error: result.error };
      }
    },
    [activeConversation]
  );

  // Handle back button for mobile
  const handleBack = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
  }, []);

  // Handle starting a new chat with the studio
  const handleStartNewChat = useCallback(async () => {
    setIsCreatingChat(true);

    try {
      const result = await getOrCreateClientConversation();

      if ("error" in result) {
        console.error("Error creating conversation:", result.error);
        return;
      }

      const newConversation = result.data;

      // Check if this conversation is already in our list
      const existingConversation = conversations.find(
        (c) => c.id === newConversation.id
      );

      if (existingConversation) {
        // Select the existing conversation
        await handleSelectConversation(existingConversation);
      } else {
        // Add to conversations list at the top and select it
        setConversations((prev) => [newConversation, ...prev]);
        await handleSelectConversation(newConversation);
      }
    } catch (error) {
      console.error("Error starting new chat:", error);
    } finally {
      setIsCreatingChat(false);
    }
  }, [conversations, handleSelectConversation]);

  // ========================================================================
  // Search Handlers
  // ========================================================================

  // Handle search query change
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setIsSearchMode(false);
      setSearchResults([]);
    }
  }, []);

  // Handle search execution
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIsSearchMode(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setIsSearchMode(true);

    try {
      const result = await searchClientMessages({ query });

      if ("data" in result) {
        setSearchResults(result.data.results);
      } else {
        console.error("Search error:", result.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search result selection - navigate to conversation and scroll to message
  const handleSelectSearchResult = useCallback(
    async (conversationId: string, _messageId: string) => {
      // Find the conversation
      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) return;

      // Exit search mode
      setIsSearchMode(false);
      setSearchQuery("");
      setSearchResults([]);

      // Select the conversation
      await handleSelectConversation(conversation);

      // Note: _messageId can be used in a future enhancement to scroll to specific message
    },
    [conversations, handleSelectConversation]
  );

  const hasConversations = conversations.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with your studio team
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartNewChat}
            disabled={isCreatingChat}
            className="gap-2"
          >
            {isCreatingChat ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Start Chat</span>
          </Button>
          <MessageSearchInput
            value={searchQuery}
            onChange={handleSearchQueryChange}
            onSearch={handleSearch}
            isSearching={isSearching}
            placeholder="Search messages..."
            className="md:w-72"
          />
        </div>
      </div>

      {/* Main content - Two column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Conversation List / Search Results - Hidden on mobile when viewing thread */}
        <Card
          className={`md:col-span-1 flex flex-col overflow-hidden ${activeConversation && !isSearchMode ? "hidden md:flex" : "flex"}`}
        >
          <CardContent className="flex-1 overflow-y-auto p-0">
            {isSearchMode ? (
              <MessageSearchResults
                results={searchResults}
                query={searchQuery}
                onSelectResult={handleSelectSearchResult}
              />
            ) : (
              <ConversationList
                conversations={conversations}
                unreadCounts={unreadCounts}
                activeConversationId={activeConversation?.id || null}
                onSelect={handleSelectConversation}
              />
            )}
          </CardContent>
        </Card>

        {/* Thread View - Full width on mobile when viewing thread */}
        <Card
          className={`md:col-span-2 flex flex-col overflow-hidden ${activeConversation && !isSearchMode ? "flex" : "hidden md:flex"}`}
        >
          {/* Mobile back button */}
          {activeConversation && !isSearchMode && (
            <div className="md:hidden border-b border-border px-4 py-2">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Back to conversations
              </Button>
            </div>
          )}

          <CardContent className="flex-1 overflow-hidden p-0">
            {activeConversation && !isSearchMode ? (
              <ThreadView
                conversation={activeConversation}
                messages={messages}
                isLoading={isLoadingMessages}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                currentUserId={currentUserId}
                onLoadMore={handleLoadMore}
                onSend={handleSendMessage}
              />
            ) : hasConversations ? (
              <ThreadPlaceholder />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
